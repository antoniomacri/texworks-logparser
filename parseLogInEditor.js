// TeXworksScript
// Title: Parse log in the editor
// Author: Antonio Macrì
// Version: 1.0
// Date: 2017-10-22
// Script-Type: standalone
// Context: TeXDocument
// Shortcut: Ctrl+K, Ctrl+K, Ctrl+P

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


// Utility functions
String.prototype.format = function () {
  var fmt = this;
  for (var i = 0; i < arguments.length; i++) {
    fmt = fmt.replace(new RegExp("%" + i, "g"), arguments[i]);
  }
  return fmt;
};


// Tracer
function Tracer(logParser) {
  var dirty = true;
  var indent = 0;
  var oldFile;
  var traceResults = "";

  function padString(length) {
    var str = "";
    while (str.length < length)
      str += " ";
    return str;
  }

  logParser.setFileOpenedCallback(function (file) {
    if (!dirty) {
      traceResults += padString(indent++ * 2) + "<file path='" + oldFile + "'>\n";
    }
    oldFile = file;
    dirty = false;
  });

  logParser.setResultAddedCallback(function (m) {
    if (!dirty) {
      traceResults += padString(indent++ * 2) + "<file path='" + oldFile + "'>\n";
    }
    traceResults += padString(indent * 2) + "<result severity='" + m.Severity + "' file='" + m.File + "' row='" + m.Row + "'>\n";
    traceResults += padString(indent * 2 + 2) + m.Description + "\n";
    traceResults += padString(indent * 2) + "</result>\n";
    dirty = true;
  });

  logParser.setFileClosedCallback(function (file) {
    if (!dirty)
      traceResults += padString(indent * 2) + "<file path='" + oldFile + "' />\n";
    else
      traceResults += padString(--indent * 2) + "</file> <!-- '" + file + "' -->\n";
    dirty = true;
  });

  this.SaveTrace = function (traceFile) {
    TW.writeFile(traceFile, traceResults);
  };

  this.GetTrace = function () {
    return traceResults;
  };
}


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


function escapeHtml(str) {
  var html = str;
  html = html.replace(/&/g, "&amp;");
  html = html.replace(/</g, "&lt;");
  html = html.replace(/>/g, "&gt;");
  html = html.replace(/\n /g, "\n&nbsp;");
  html = html.replace(/  /g, "&nbsp;&nbsp;");
  html = html.replace(/&nbsp; /g, "&nbsp;&nbsp;");
  return html.replace(/\n/g, "<br />\n");
}


var file = TW.readFile("logParser.js");
if (file.status == 0) {
  eval(file.result);

  TW.fileExists = function () { return 2; };

  var parser = new LogParser();
  var tracer = new Tracer(parser);

  var timeInParse = 0;
  var timeInMatchNewFile = 0;

  parser.MatchNewFile = (function (old) {
    return function () {
      var start = Date.now();
      var result = old.apply(this, arguments);
      timeInMatchNewFile += Date.now() - start;
      return result;
    }
  })(parser.MatchNewFile);

  parser.Parse = (function (old) {
    return function () {
      var start = Date.now();
      var result = old.apply(this, arguments);
      timeInParse += Date.now() - start;
      return result;
    }
  })(parser.Parse);

  var input = TW.target.text;
  if ((input && /^This is .{1,10}TeX/.test(input)) || TW.question(null, "", NOTHING_TO_PARSE, 0x14000) == 0x4000) {
    parser.Parse(input, TW.target.rootFileName);
    ShowOutputDialog(parser.GenerateReport() +
      "\n<hr>\n" +
      "Timings:" +
      "<table>" +
      "<tr><td>&nbsp;</td><td>Result parsing:</td><td>&nbsp;</td><td>" + (timeInParse - timeInMatchNewFile) / 1000 + "&thinsp;ms</td></tr>" +
      "<tr><td>&nbsp;</td><td>File mathing:</td><td>&nbsp;</td><td>" + timeInMatchNewFile / 1000 + "&thinsp;ms</td></tr>" +
      "<tr><td>&nbsp;</td><td>Total:</td><td>&nbsp;</td><td>" + timeInParse / 1000 + "&thinsp;ms</td></tr>" +
      "</table>" +
      "\n<hr>\n" +
      "Trace follows:<br><br><tt>" + escapeHtml(tracer.GetTrace()) + "</tt>");
  }
}
else {
  TW.critical(null, "", CANNOT_LOAD_FILE.format("logParser.js", file.status));
}
null;
