// TeXworksScript
// Title: Log parser tests
// Author: Antonio Macrì
// Version: 1.0
// Date: 2012-03-07
// Script-Type: standalone
// Context: TeXDocument
// Shortcut: Ctrl+K, Ctrl+K, Ctrl+T

/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
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


function GenerateDiff(expected, unexpected)
{
  var sb =  new StringBuilder();
  sb.append("<table border='0' cellspacing='0' cellpadding='4'>");
  sb.append("<tr><td></td><td colspan='3'>Expected:</td></tr>");
  var k = 0;
  for (var i=0; i < expected.length; i++) {
    for (var j=k; j < unexpected.length; j++) {
      if (Result.Equals(expected[i], unexpected[j])) {
        var tmp = unexpected[k];
        unexpected[k] = unexpected[j];
        unexpected[j] = tmp;
        k++;
        break;
      }
    }
    if (j == unexpected.length) {
      sb.append(LogParser.GenerateResultRow(expected[i]));
    }
  }
  if (k < unexpected.length) {
    sb.append("<tr><td></td><td colspan='3'>Unexpected:</td></tr>");
    for (; k<unexpected.length; k++) {
      sb.append(LogParser.GenerateResultRow(unexpected[k]));
    }
  }
  sb.append("</table>");
  return sb.toString();
}

var file = TW.readFile("logParser.js");
if (file.status == 0) {
  eval(file.result);
  file = null;  // free mem

  var marker = "-----BEGIN OUTPUT BLOCK-----\n";
  var parser = new LogParser();

  var sb = new StringBuilder();
  var folders = ["tests-miktex", "tests-texlive-ubuntu" ];
  var totalTests = 0;
  var failedTests = 0;
  for (var i = 0; i < folders.length; i++) {
    var grouping = false;
    for (var j = 1; ; j++) {
      var filename = folders[i] + "/" + j + ".test";
      var result = TW.readFile(filename);
      if (result.status == 2) {
        TW.warning(null, "", "Cannot read files! Change your TeXworks settings.");
      }
      if (result.status != 0) {
        break;
      }
      result = result.result;

      var index = result.indexOf(marker);
      var output = result.slice(index + marker.length);
      result = result.slice(0, index);
      parser.ParseOutput(output);

      var expected = eval("(function(){return " + result + ";})()");
      var generated = parser.Results;

      var passed = expected.length == generated.length;
      for (var k=0; k<expected.length && passed; k++) {
        passed = Result.Equals(expected[k], generated[k]);
      }

      if (!passed) {
        if (grouping) {
          sb.append("</td></tr>");
          grouping = false;
        }
        sb.append("<tr>");
        sb.append("<td style='background-color: red'></td>");
        sb.append("<td valign='top'>" + filename + "</td>");
        sb.append("<td valign='top'><font size=-2>" + GenerateDiff(expected, generated) + "</font></td>");
        sb.append("</tr>");
      }
      else if (grouping) {
        sb.append(", " + filename);
      }
      else {
        sb.append("<tr>");
        sb.append("<td style='background-color: green'></td>");
        sb.append("<td valign='top' colspan='2'>" + filename);
        grouping = true;
      }
      failedTests += passed ? 0 : 1;
    }
    if (grouping) {
      sb.append("</td></tr>");
    }
  }

  var html = "<html><body>";
  html += "Total tests: " + totalTests +
          ", Failed tests: " + failedTests + "<hr/>";
  html += "<table border='0' cellspacing='0' cellpadding='4'>";
  html += sb.toString();
  html += "</table></body></html>";
  TW.result = html;
}
else {
  TW.warning(null, "", "Cannot load script \"logParser.js\"!");
}
undefined;

/*
 * Error in a file with a short name (e.g., 'test.tex')
 * Error in a file with a long name (too long for a single line) (e.g., 'a-very-very-long-file-name-to-ensure-latex-error-messages-are-broken-across-lines.tex')
 * Error in a file with spaces (e.g., 'test file.tex')
 * Error in a file with quotation marks (e.g., 'test "file".tex')
 * Error in a file with contained braces (e.g., 'test (file).tex')
*/

// Should catch filenames of the following forms:
// * ./abc, "./abc"
// * /abc, "/abc"
// * .\abc, ".\abc"
// * C:\abc, "C:\abc"
// * \\server\abc, "\\server\abc"


    //  3. queste parentesi tonde chiuse (a causa delle interruzioni di riga forzate che ci mette PDFLaTeX) capitano proprio
    //     alla fine di una riga.
    

/*
Output for TL on WinXP:
----------------------------------------
entering extended mode
(./test.tex
LaTeX2e <2011/06/27>
----------------------------------------
entering extended mode

(./a-very-very-long-file-name-to-ensure-latex-error-messages-are-broken-across-
lines.tex
LaTeX2e <2011/06/27>
----------------------------------------
entering extended mode
(./test file.tex
LaTeX2e <2011/06/27>
----------------------------------------
" character disallowed in file names
----------------------------------------
entering extended mode
(./test (file).tex
LaTeX2e <2011/06/27>
----------------------------------------
*/
