// TeXworksScript
// Title: Run log parser tests
// Author: Antonio Macrì
// Version: 1.0
// Date: 2012-03-07
// Script-Type: standalone
// Context: TeXDocument
// Shortcut: Ctrl+K, Ctrl+K, Ctrl+T

/*
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


justLoad = null;


// Internationalization
var CANNOT_LOAD_FILE = "Cannot load \"%0\" (status: %1\).";
var CANNOT_CREATE_UI = "Cannot create the UI dialog.";
var NOTHING_TO_PARSE = "The editor content does not seem a valid LaTeX log. Copy the LaTeX output or a log into the editor and rerun this script.\n\nShould I parse the editor as a log now?";


function ShowOutputDialog(markup) {
  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<ui version="4.0"><class>Dialog</class><widget class="QDialog" name="Dialog"><property name="windowModality"><enum>Qt::WindowModal</enum></prope' +
    'rty><property name="geometry"><rect><x>0</x><y>0</y><width>600</width><height>500</height></rect></property><property name="minimumSize"><size><' +
    'width>250</width><height>0</height></size></property><property name="windowTitle"><string>Results</string></property><property name="sizeGripEna' +
    'bled"><bool>false</bool></property><property name="modal"><bool>true</bool></property><layout class="QGridLayout" name="gridLayout"><item row="0' +
    '" column="0"><layout class="QVBoxLayout" name="verticalLayout"><property name="spacing"><number>5</number></property><property name="sizeConstra' +
    'int"><enum>QLayout::SetMinAndMaxSize</enum></property><property name="leftMargin"><number>0</number></property><item><widget class="QTextEdit" n' +
    'ame="textOutput"><property name="undoRedoEnabled"><bool>false</bool></property><property name="readOnly"><bool>true</bool></property></widget></' +
    'item><item><widget class="QDialogButtonBox" name="buttonBox"><property name="sizePolicy"><sizepolicy hsizetype="Expanding" vsizetype="Fixed"><ho' +
    'rstretch>0</horstretch><verstretch>0</verstretch></sizepolicy></property><property name="orientation"><enum>Qt::Horizontal</enum></property><pro' +
    'perty name="standardButtons"><set>QDialogButtonBox::Ok</set></property></widget></item></layout></item></layout></widget><tabstops><tabstop>butt' +
    'onBox</tabstop></tabstops><resources/><connections><connection><sender>buttonBox</sender><signal>accepted()</signal><receiver>Dialog</receiver><' +
    'slot>accept()</slot><hints><hint type="sourcelabel"><x>229</x><y>371</y></hint><hint type="destinationlabel"><x>157</x><y>274</y></hint></hints>' +
    '</connection><connection><sender>buttonBox</sender><signal>rejected()</signal><receiver>Dialog</receiver><slot>reject()</slot><hints><hint type=' +
    '"sourcelabel"><x>297</x><y>377</y></hint><hint type="destinationlabel"><x>286</x><y>274</y></hint></hints></connection></connections></ui>';

  var dialog = TW.createUIFromString(xml);
  if (!dialog) {
    TW.critical(null, "", CANNOT_CREATE_UI);
    return false;
  }

  var textOutput = TW.findChildWidget(dialog, "textOutput");
  textOutput.setText(markup);

  var result = dialog.exec() == 1;

  try {
    dialog.deleteLater();
    labelOutput.deleteLater();
  } catch (e) { }

  return result;
}


var file = TW.readFile("logParser.js");
if (file.status == 0) {
  eval(file.result);
  file = null;  // free mem

  var marker = "-----BEGIN OUTPUT BLOCK-----\n";

  var parser = new LogParser();
  var totalTests = 0;
  var failedTests = 0;

  var fex = [];
  fex[0] = function () { return 2; };
  fex[1] = function (f) {
    var result = files.some(function (ff) {
      return f == ff || ff.slice(0, f.length) == f && (ff[f.length] == '\\' || ff[f.length] == '/');
    }) ? 0 : 1;
    return result;
  };

  function TestResult(expected, generated) {
    this.Expected = expected;
    this.Generated = generated;
    var passed = expected.length == generated.length;
    for (var k = 0; k < expected.length && passed; k++) {
      passed = Result.Equals(expected[k], generated[k]);
    }
    this.Passed = passed;
  }

  function RunTests(folder) {
    var testResults = [];
    for (var i = 1; ; i++) {
      var filename = folder + "/" + i + ".test";
      var result = TW.readFile(filename);
      if (result.status != 0) {
        break;
      }
      result = result.result;

      testResults[i] = [];
      for (var j = 0; j < fex.length; j++) {
        TW.fileExists = fex[j];
        totalTests++;

        var index = result.indexOf(marker);
        var output = result.slice(index + marker.length);
        var exp = result.slice(0, index);
        parser.Parse(output);

        var expected = eval("(function(){return " + exp + ";})()");
        var generated = parser.Results;
        var testResult = new TestResult(expected, generated);
        testResults[i][j] = testResult;
        failedTests += testResult.Passed ? 0 : 1;
      }
    }
    return testResults;
  }

  function GenerateResultDiff(expected, unexpected) {
    var s = "";
    s += "<table border='0' cellspacing='0' cellpadding='4'>";
    s += "<tr><td></td><td colspan='3'>Expected:</td></tr>";
    var k = 0;
    for (var i = 0; i < expected.length; i++) {
      for (var j = k; j < unexpected.length; j++) {
        if (Result.Equals(expected[i], unexpected[j])) {
          var tmp = unexpected[k];
          unexpected[k] = unexpected[j];
          unexpected[j] = tmp;
          k++;
          break;
        }
      }
      if (j == unexpected.length) {
        s += parser.GenerateResultRow(expected[i]);
      }
    }
    if (k < unexpected.length) {
      s += "<tr><td></td><td colspan='3'>Unexpected:</td></tr>";
      for (; k < unexpected.length; k++) {
        s += parser.GenerateResultRow(unexpected[k]);
      }
    }
    s += "</table>";
    return s;
  }


  function GenerateDiff(folder, testResults) {
    var s = "";
    var iFirst = 1;
    for (var i = 1; i < testResults.length; i++) {
      var jFirst = 0;
      for (var j = 0; j < testResults[i].length; j++) {
        var testResult = testResults[i][j];
        if (!testResult.Passed) {
          if (iFirst < i) {
            s += "<tr>";
            s += "<td style='background-color: green'></td>";
            if (iFirst == i - 1) {
              s += "<td valign='top' colspan='2'>" + folder + "/" + iFirst + ".test</td>";
            } else {
              s += "<td valign='top' colspan='2'>" + folder + "/" + iFirst + "..." + (i - 1) + ".test</td>";
            }
            s += "</tr>";
          }
          if (jFirst < j) {
            s += "<tr>";
            s += "<td style='background-color: green'></td>";
            if (jFirst == j - 1) {
              s += "<td valign='top' colspan='2'>" + folder + "/" + i + "[" + jFirst + "].test</td>";
            } else {
              s += "<td valign='top' colspan='2'>" + folder + "/" + i + "[" + jFirst + "..." + j + "].test</td>";
            }
            s += "</tr>";
          }
          s += "<tr>";
          s += "<td style='background-color: red'></td>";
          s += "<td valign='top'>" + folder + "/" + i + "[" + j + "].test</td>";
          s += "<td valign='top'><font size=-2>" + GenerateResultDiff(testResult.Expected, testResult.Generated) + "</font></td>";
          s += "</tr>";
          iFirst = i + 1;
          jFirst = j + 1;
        }
      }
    }
    if (iFirst < testResults.length) {
      s += "<tr>";
      s += "<td style='background-color: green'></td>";
      if (iFirst == testResults.length - 1) {
        s += "<td valign='top' colspan='2'>" + folder + "/" + iFirst + ".test</td>";
      } else {
        s += "<td valign='top' colspan='2'>" + folder + "/" + iFirst + "..." + (testResults.length - 1) + ".test</td>";
      }
      s += "</tr>";
    }
    return s;
  }

  var s = "";

  var folders = ["tests-miktex", "tests-texlive-ubuntu", "tests-texlive-windows"];
  for (var j = 0; j < folders.length; j++) {
    var files = TW.readFile(folders[j] + "/files.js");
    if (files.status == 0) {
      files = eval("(function(){return " + files.result + ";})()");
    }
    else {
      files = [];
    }
    var testResults = RunTests(folders[j]);
    s += GenerateDiff(folders[j], testResults);
  }

  var html = "<html><body>";
  html += "Total tests: " + totalTests +
    ", Failed tests: " + failedTests + "<hr/>";
  html += "<table border='0' cellspacing='0' cellpadding='4'>";
  html += s;
  html += "</table></body></html>";
  ShowOutputDialog(html);
}
else {
  TW.warning(null, "", "Cannot load script \"logParser.js\"!");
}
undefined;
