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
      if (unexpected[j].Equals(expected[i])) {
        var tmp = unexpected[k];
        unexpected[k] = unexpected[j];
        unexpected[j] = tmp;
        k++;
        break;
      }
    }
    if (j == unexpected.length) {
      sb.append(LatexOutputParser.GenerateResultRow(expected[i]));
    }
  }
  if (k < unexpected.length) {
    sb.append("<tr><td></td><td colspan='3'>Unexpected:</td></tr>");
    for (; k<unexpected.length; k++) {
      sb.append(LatexOutputParser.GenerateResultRow(unexpected[k]));
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
  var parser = new LatexOutputParser();

  var failedTests = 0;
  var sb = new StringBuilder();
  var i = 1;
  for (; ; i++)
  {
    var filename = "tests/" + i + ".test";
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
    for (var j=0; j<expected.length && passed; j++) {
      passed = generated[j].Equals(expected[j]);
    }
    sb.append("<tr>");
    sb.append("<td style='background-color: " + (passed ? "green" : "red") + "'></td>");
    sb.append("<td valign='top'>" + filename + "</td>");
    if (!passed) {
      sb.append("<td valign='top'><font size=-2>" + GenerateDiff(expected, generated) + "</font></td>");
    }
    else {
      sb.append("<td valign='top'></td>");
    }
    sb.append("</tr>");
    failedTests += passed ? 0 : 1;
  }
  
  var html = "<html><body>";
  html += "Total tests: " + (i - 1) +
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


    //  2. il nome/percorso del file contiene parentesi tonde chiuse;
    //  3. queste parentesi tonde chiuse (a causa delle interruzioni di riga forzate che ci mette PDFLaTeX) capitano proprio
    //     alla fine di una riga.
    

/*
Output for MiKTeX 2.9 on WinXP:
----------------------------------------
entering extended mode
("C:\Dokumente und Einstellungen\test.tex"
LaTeX2e <2009/09/24>
----------------------------------------
entering extended mode

(C:\a-very-very-long-file-name-to-ensure-latex-error-messages-are-broken-across
-lines.tex
----------------------------------------
This is pdfTeX, Version 3.1415926-1.40.11 (MiKTeX 2.9)
entering extended mode
("C:\test file.tex"
----------------------------------------
" character disallowed in file names
----------------------------------------
This is pdfTeX, Version 3.1415926-1.40.11 (MiKTeX 2.9)
entering extended mode
("C:\test (file).tex"
----------------------------------------


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