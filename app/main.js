// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var parentId = "copyParent";
var copyId = "copy";
var copyLinkId = "copyLink";

function copyToClipboard(text) {
    var tempCopyNode = document.createElement("textarea");
    document.body.appendChild(tempCopyNode);
    tempCopyNode.value = text;
    tempCopyNode.focus();
    tempCopyNode.select();
    document.execCommand("copy");
    tempCopyNode.remove();
}

function getText() {
  //You can play with your DOM here or check URL against your regex
  console.log('Tab script:');
  console.log(document.body);
  return document.body.innerText;
}

function getNextSeparator(text, searchForward) {
  let blankIndex, breakIndex, break2Index;
  if (searchForward) {
    let separatorIndizes = [
      text.indexOf(" "),
      text.indexOf("\n"),
      text.indexOf("\r")
      ];

      return Math.min(...separatorIndizes.filter(x => x >= 0));
  } else {
    let separatorIndizes = [
      text.lastIndexOf(" "),
      text.lastIndexOf("\n"),
      text.lastIndexOf("\r")
      ];

      return Math.max(...separatorIndizes.filter(x => x >= 0));
  }
}

// A generic onclick callback function.
function onCopy(info, tab) {
  let pageText;
  console.log("item " + info.menuItemId + " was clicked");
  console.log("info: " + JSON.stringify(info));
  console.log("tab: " + JSON.stringify(tab));

  let copyText = info.selectionText;
  
  // execute script to get further page content for smart citing
  chrome.tabs.executeScript({
      code: '(' + getText + ')();'
  }, (results) => {
      // perform smart citing when possible
      if (results !== undefined) {
        console.log('Popup script:')
        console.log(results[0]);

        pageText = results[0];
        let selectionIndex = pageText.indexOf(copyText),
            selectionEndIndex = selectionIndex + copyText.length,
            textBefore = pageText.substring(0, selectionIndex);
        
        if (selectionIndex !== -1) {
          // handle quote beginning

          // copy whole first word if it was only partly marked
          if (!textBefore.endsWith(" ")) {
            let blankIndex = getNextSeparator(textBefore, false);
            copyText = textBefore.substring(blankIndex + 1) + copyText;
            textBefore = textBefore.substring(0, blankIndex + 1);
          }

          if (!textBefore.endsWith("\n") &&
              !textBefore.endsWith("\r") &&
              !textBefore.trim().endsWith(".") &&
              !textBefore.trim().endsWith("?") &&
              !textBefore.trim().endsWith("!")) {
            copyText = "[...] " + copyText;
          }

          // handle quote ending

          let textAfter = pageText.substring(selectionEndIndex);

          // copy whole last word if it was only partly marked
          if (!textAfter.startsWith(" ")) {
            let separatorIndex = getNextSeparator(textAfter, true);

            copyText = copyText + textAfter.substring(0, separatorIndex);
            textAfter = textAfter.substring(separatorIndex);
          }

          if (!copyText.endsWith(".") && !copyText.endsWith("?") && !copyText.endsWith("!")) {
            if (!textAfter.startsWith("\n") && !textAfter.startsWith("\r") && !textAfter.trim().startsWith("\"")) {
              copyText += " [...]";
            }
          }
        } else {
          alert("Error during smart citing. Please report this error with the erronous quote and a link to the source website.\r\nText was copied as simple quote.");
        }
      } else {
        alert("Smart citing is not available in extensions and certain pages due to restrictions by Chrome.\r\nText was copied as simple quote.");
      }

      copyText = "\"" + copyText + "\"";

      if (info.menuItemId === copyLinkId) {
        copyText += ("\r\n— " + info.pageUrl);
      }

      copyToClipboard(copyText);
  });
}

// Register context menu
chrome.runtime.onInstalled.addListener(function() {
    var contexts = ["selection"];

    // Create a parent item and two children.
    var parent = chrome.contextMenus.create({"id": parentId, "title": "Quote Copy", "contexts": contexts});
    var child1 = chrome.contextMenus.create(
      {"id": copyId, "title": "Copy selected text as quote", "parentId": parentId, "contexts": contexts});
    var child2 = chrome.contextMenus.create(
      {"id": copyLinkId, "title": "Copy selected text as quote with link", "parentId": parentId, "contexts": contexts});
    console.log("parent:" + parent + " child1:" + child1 + " child2:" + child2);
});

chrome.contextMenus.onClicked.addListener(onCopy);