const API_ENDPOINT = "https://api.sharepass.com/v1";
const VIEW_URL = "https://view.sharepass.com";
const DOMAINS = [
  "otp.natan.com.au",
  "otp.centrevision.com.au",
  "sharepass-otp.silentbreach.com",
  "secure.aushp.com.au",
  "app.schur.sharepass.com",
  "app.sharepass.com",
  "secure.ymtech.com",
  "otp.centreforcybersecurity.com",
  "app.arcare.sharepass.com"
];

const getUrls = () => chrome.storage.local.get(["siteUrl", "apiURL"]);

var menuCreation = false;

console.log("rebind bs", new Date());

chrome.runtime.onInstalled.addListener(async () => {
  console.log("installed! at ", new Date());

  for (const cs of chrome.runtime.getManifest().content_scripts) {
    for (const tab of await chrome.tabs.query({ url: cs.matches })) {
      if (
        !tab.url.startsWith("chrome") &&
        tab.url != "" &&
        !tab.url.startsWith("https://chrome") &&
        !tab.url.startsWith("https://www.google") &&
        !tab.url.startsWith("https://google")
      ) {
        try {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: cs.js,
          });

          chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: cs.css,
          });
        } catch (e) {
          console.log(e, tab.url);
        }
      }
    }
  }
});

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  const myNewUrl = new URL(tab.url);

  if (
    changeInfo.status == "complete" &&
    DOMAINS.includes(myNewUrl.host) &&
    (myNewUrl.pathname.startsWith("/admin/dashboard") ||
      myNewUrl.pathname.startsWith("/auth/login"))
  ) {
    chrome.tabs.sendMessage(
      tabId,
      {
        message: "updateLocalStorage",
      },
      {
        frameId: changeInfo.frameId,
      },
      async function (response) {
        if (response && response.sessionData) {
          /**
           * Clear background js
           * chrome.storage.local.clear();
           * Addded on react app - Login.js - line 455
           * To delete from extension storage
           */

          let user = await chrome.storage.local.get(["user"]);
          let instanceAux = "";
          let host = (await chrome.storage.local.get(["host"])).host || "";
          let apiURL =
            (await chrome.storage.local.get(["apiURL"])).apiURL || "";

          if (user && user["user"]) {
            user = JSON.parse(user["user"]);
            if (user && user.instance) {
              instanceAux = user.instance;
            }
          }

          const sessionData = JSON.parse(response.sessionData);
          const instance = JSON.parse(sessionData.user).instance || "";

          if (!JSON.parse(sessionData.user).logged && host == myNewUrl.host) {
            chrome.storage.local.clear();
            chrome.action.setIcon({
              path: {
                16: `../images/logo16.png`,
                48: `../images/logo48.png`,
                128: `../images/logo128.png`,
              },
            });
          }

          let keys = Object.keys(sessionData),
            i = keys.length;

          if (
            sessionData.user &&
            JSON.parse(sessionData.user).email != undefined &&
            host == "" &&
            (myNewUrl.host == "app.sharepass.com" ||
              (myNewUrl.host != "app.sharepass.com" && apiURL != ""))
          ) {
            while (i--) {
              let elem = {};
              elem[keys[i]] = sessionData[keys[i]];
              chrome.storage.local.set(elem);
            }

            chrome.storage.local.set({ host: myNewUrl.host });
          }

          if (
            instance != "" &&
            myNewUrl.host != "app.sharepass.com" &&
            apiURL != ""
          ) {
            chrome.action.setIcon({
              path: {
                16: `../images/${instance}/logo16.png`,
                48: `../images/${instance}/logo48.png`,
                128: `../images/${instance}/logo128.png`,
              },
            });
          }

          await createMenu();
        }
      }
    );
  }

  return true;
});

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.message == "createSecretFromTemplate") {
    handleSharePassItFromTemplate(
      request.tab,
      request.info,
      request.id,
      request.codeName
    );

    sendResponse({ status: true });
  } else {
    sendResponse({ status: false });
  }

  return true;
});

function menuCreationEnd() {
  menuCreation = false;
}

// Create a menu
async function createMenu() {
  if (menuCreation) {
    return true;
  }

  menuCreation = true;

  // remove existing menu items
  await chrome.storage.local.get(
    [
      "user",
      "refreshToken",
      "userId",
      "idToken",
      "expiresIn",
      "token",
      "siteUrl",
      "apiURL",
    ],
    async function (items) {
      let alertError = "Sorry, we have some errors, please try again later";

      chrome.contextMenus.removeAll(async () => {
        try {
          // We need to check if the user is logged
          const { token } = items;

          if (token) {
            const { isLogged } = await isLoggedIn(items);

            if (isLogged) {
              // create a menu
              chrome.contextMenus.create({
                title: `Quick (default)`,
                id: "sharepassit",
                // show the menu over everything
                contexts: ["editable", "selection"],
                documentUrlPatterns: ["https://*/*"],
                // IMPORTANT: because we are no longer using a
                // persistent background script we will need to
                // add an event listener outside contextMenus.create.
              });

              chrome.contextMenus.create(
                {
                  title: `From template`,
                  id: "sharepassittemplates",
                  // show the menu over everything
                  contexts: ["editable", "selection"],
                  documentUrlPatterns: ["https://*/*"],
                  // IMPORTANT: because we are no longer using a
                  // persistent background script we will need to
                  // add an event listener outside contextMenus.create.
                },
                menuCreationEnd
              );
            } else {
              chrome.contextMenus.create(
                {
                  title: `Sign in to SharePass`,
                  id: "sharepassitfree",
                  // show the menu over everything
                  contexts: ["editable", "selection"],
                  documentUrlPatterns: ["https://*/*"],
                  // IMPORTANT: because we are no longer using a
                  // persistent background script we will need to
                  // add an event listener outside contextMenus.create.
                },
                menuCreationEnd
              );
            }
          } else {
            chrome.contextMenus.create(
              {
                title: `Sign in to SharePass`,
                id: "sharepassitfree",
                // show the menu over everything
                contexts: ["editable", "selection"],
                documentUrlPatterns: ["https://*/*"],
                // IMPORTANT: because we are no longer using a
                // persistent background script we will need to
                // add an event listener outside contextMenus.create.
              },
              menuCreationEnd
            );
          }

          chrome.contextMenus.onClicked.addListener(createSecret);

          return true;
        } catch (error) {
          console.log("Error createMenu", error);

          return false;
        }
      });
    }
  );
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function createSecret(info, tab) {
  // First step - insert a spinner
  let customId = Date.now();

  if (info.pageUrl.startsWith("chrome://")) {
    return false;
  }

  await chrome.tabs.sendMessage(
    tab.id,
    {
      id: customId,
      message: "insertSpinner",
    },
    {
      frameId: info.frameId,
    },
    async function () {
      chrome.tabs.sendMessage(
        tab.id,
        {
          id: customId,
          message: "checkSpinnerInput",
        },
        {
          frameId: info.frameId,
        },
        async function (response) {
          if (response.status) {
            try {
              let password = info.selectionText;

              if (password && password.length > 0 && info.menuItemId != "sharepassitfree") {
                let secretContent = password;

                let randomWord = self.crypto.getRandomValues(
                  new Uint8Array(32)
                );
                randomWord = _arrayBufferToBase64(randomWord).replace(/=/g, "");

                randomWord = randomWord.replace(/\//g, "a");
                randomWord = randomWord.replace(/\+/g, "b");

                let encryptedData = await encryptSecret(
                  randomWord,
                  secretContent
                );

                let body = {};
                let headers = {
                  "Content-Type": "application/json",
                };
                let url;

                switch (info.menuItemId) {
                  case "sharepassit":
                    await handleSharePassItDefault(
                      tab,
                      info,
                      customId,
                      url,
                      encryptedData,
                      randomWord,
                      headers
                    );
                    break;
                  case "sharepassittemplates":
                    await showTemplates(tab, info, customId, url, headers);
                    break;
                  /*case "sharepassitfree":
                    const { apiURL } = await getUrls();
                    const apiURLAux = apiURL || API_ENDPOINT;
                    url = apiURLAux + "/secret";
                    body = {
                      secret: _arrayBufferToBase64(encryptedData),
                      type: "password",
                      otl: true,
                    };

                    await makeAPICallCreateSecret(
                      tab,
                      info,
                      customId,
                      url,
                      body,
                      randomWord,
                      headers
                    );
                
                    break;*/
                }
              } else if (info.menuItemId == "sharepassitfree") {

                await chrome.tabs.sendMessage(
                  tab.id,
                  {
                    text: info.selectionText,
                    message: "removeSpinner",
                    id: customId,
                  },
                  {
                    frameId: info.frameId,
                  }
                );

                chrome.tabs.create({
                  url: "https://app.sharepass.com"
                });

              } else {
                console.log("Please, select something to sharepass");

                await chrome.tabs.sendMessage(
                  tab.id,
                  {
                    text: info.selectionText,
                    message: "removeSpinner",
                    id: customId,
                    errorMessage: "Please, select something to share!",
                  },
                  {
                    frameId: info.frameId,
                  }
                );
              }
            } catch (error) {
              console.log(error);
              // We need to remove spineer if the service fails

              await chrome.tabs.sendMessage(
                tab.id,
                {
                  text: info.selectionText,
                  message: "removeSpinner",
                  id: customId,
                  errorMessage: "Connection issue",
                },
                {
                  frameId: info.frameId,
                }
              );
            }
          } else {
            await chrome.tabs.sendMessage(
              tab.id,
              {
                text: info.selectionText,
                message: "removeSpinner",
                id: customId,
                errorMessage:
                  "This input is not compatible with SharePass extension. If you wish to request additional features, please contact us at <a class='spe-modal-link' href='https://sharepass.com/register-your-interest' target='_blank'>https://sharepass.com/register-your-interest</a>.",
              },
              {
                frameId: info.frameId,
              }
            );
          }
        }
      );
    }
  );

  return true;
}

async function showTemplates(tab, info, customId, url, headers) {
  chrome.storage.local.get(
    [
      "user",
      "refreshToken",
      "userId",
      "idToken",
      "expiresIn",
      "token",
      "siteUrl",
      "apiURL",
    ],
    async function (items) {
      // We need to check if the user is logged
      const { token, apiURL } = items;

      if (token) {
        const { isLogged, newToken } = await isLoggedIn(items);

        if (isLogged) {
          const FINAL_API_ENDPOINT = apiURL || API_ENDPOINT;
          url =
            FINAL_API_ENDPOINT + "/user/settings/secrettemplate/mytemplates";
          headers.Auth = newToken === "" ? token : newToken;

          if(apiURL){
            headers.global = true;
          }

          const templates = await makeAPICallGetTemplates(url, headers);

          await chrome.tabs.sendMessage(
            tab.id,
            {
              message: "showTemplates",
              id: customId,
              templates: templates,
              info: info,
              tab: tab,
            },
            {
              frameId: info.frameId,
            }
          );
        } else {
          informErrorSession(info, tab, customId);
        }
      } else {
        informErrorSession(info, tab, customId);
      }
    }
  );

  return true;
}

async function handleSharePassItFromTemplate(tab, info, customId, codeName) {
  chrome.storage.local.get(
    [
      "user",
      "refreshToken",
      "userId",
      "idToken",
      "expiresIn",
      "token",
      "siteUrl",
      "apiURL",
    ],
    async function (items) {
      let secretContent = info.selectionText;

      if (secretContent && secretContent.length > 0) {
        let randomWord = self.crypto.getRandomValues(new Uint8Array(32));
        randomWord = _arrayBufferToBase64(randomWord).replace(/=/g, "");

        randomWord = randomWord.replace(/\//g, "a");
        randomWord = randomWord.replace(/\+/g, "b");

        let encryptedData = await encryptSecret(randomWord, secretContent);

        let body = {
          templateCodeName: codeName,
        };

        let headers = {
          "Content-Type": "application/json",
        };

        const { token, apiURL } = items;

        if (token) {
          const { isLogged, newToken } = await isLoggedIn(items);

          if (isLogged) {
            const FINAL_API_ENDPOINT = apiURL || API_ENDPOINT;
            let url = FINAL_API_ENDPOINT + "/secret/mysecrets/template";
            headers.Auth = newToken === "" ? token : newToken;

            body.secret = _arrayBufferToBase64(encryptedData);
            body.type = "message";

            await makeAPICallCreateSecret(
              tab,
              info,
              customId,
              url,
              body,
              randomWord,
              headers
            );
          } else {
            informErrorSession(info, tab, customId);
          }
        } else {
          informErrorSession(info, tab, customId);
        }
      } else {
        console.log("Please, select something to sharepass");
        return false;
      }
    }
  );
}

async function handleSharePassItDefault(
  tab,
  info,
  customId,
  url,
  encryptedData,
  randomWord,
  headers
) {
  chrome.storage.local.get(
    [
      "user",
      "refreshToken",
      "userId",
      "idToken",
      "expiresIn",
      "token",
      "siteUrl",
      "apiURL",
    ],
    async function (items) {
      let password = info.selectionText;

      //try {
      if (password && password.length > 0) {
        // We need to check if the user is logged
        const { token, apiURL } = items;

        if (token) {
          const { isLogged, newToken } = await isLoggedIn(items);

          if (isLogged) {
            const FINAL_API_ENDPOINT = apiURL || API_ENDPOINT;

            url = FINAL_API_ENDPOINT + "/secret/mysecrets/default";
            headers.Auth = newToken === "" ? token : newToken;
            body = {
              type: "message",
              secret: _arrayBufferToBase64(encryptedData),
            };

            await makeAPICallCreateSecret(
              tab,
              info,
              customId,
              url,
              body,
              randomWord,
              headers
            );
          } else {
            informErrorSession(info, tab, customId);
          }
        } else {
          informErrorSession(info, tab, customId);
        }
      } else {
        console.log("Please, select something to sharepass");
        return false;
      }
    }
  );
}

async function informErrorSession(info, tab, customId) {
  /**
   * Clear background js
   */
  await chrome.storage.local.clear(function () {
    var error = chrome.runtime.lastError;
    if (error) {
      console.error("ERROR WHEN CLEARING STORAGE: ", error);
    }
  });

  await createMenu();

  await chrome.tabs.sendMessage(
    tab.id,
    {
      text: info.selectionText,
      message: "removeSpinner",
      id: customId,
      errorMessage:
        "Your session expired, log in or share again using free public version",
    },
    {
      frameId: info.frameId,
    }
  );
}

async function makeAPICallGetTemplates(url, headers) {
  return fetch(url, {
    method: "GET",
    headers,
  })
    .then((res) => res.json())
    .then(async (data) => {
      if (data.status === "Success") {
        const { details } = data;
        return details;
      } else {
        return false;
      }
    })
    .catch((error) => {
      console.log("Error fetch when trying to get templates: ", error);

      return false;
    });
}

async function makeAPICallCreateSecret(
  tab,
  info,
  customId,
  url,
  body,
  randomWord,
  headers
) {
  await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .then(async (data) => {
      if (data.status === "Success") {
        const { details } = data;

        const secretIdParts = [
          encodeURIComponent(details.secretId).substring(0, 15),
          encodeURIComponent(details.secretId).substring(15),
        ];

        const { siteUrl } = await getUrls();
        const FINAL_VIEW_URL = siteUrl || VIEW_URL;
        let urlAppendData = `${FINAL_VIEW_URL}/${secretIdParts[0]}/#/${
          secretIdParts[1]
        }/${encodeURIComponent(randomWord)}`;

        if(details.pin){
          urlAppendData += '/pin';
        }

        await chrome.tabs.sendMessage(
          tab.id,
          {
            clickable: details.revealMessage,
            text: urlAppendData,
            message: "replaceSelectedText",
            id: customId,
          },
          {
            frameId: info.frameId,
          }
        );

        return true;
      } else if (data.status === "Error") {
        // We need to remove spineer if the service fails

        await chrome.tabs.sendMessage(
          tab.id,
          {
            text: info.selectionText,
            message: "removeSpinner",
            id: customId,
            errorMessage: data.message,
          },
          {
            frameId: info.frameId,
          }
        );

        return false;
      } else {
        // We need to remove spineer if the service fails

        await chrome.tabs.sendMessage(
          tab.id,
          {
            text: info.selectionText,
            message: "removeSpinner",
            id: customId,
            errorMessage: data.message,
          },
          {
            frameId: info.frameId,
          }
        );

        return false;
      }
    })
    .catch((error) => {
      console.log("Error fetch when trying to create a secret: ", error);

      return false;
    });
}

function _arrayBufferToBase64(buffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return self.btoa(binary);
}

async function encryptSecret(key, content) {
  let enc = new TextEncoder();
  let encoded = enc.encode(content);
  let nonce = self.crypto.getRandomValues(new Uint8Array(12));
  var aesKey = base64ToArrayBuffer(key);
  aesKey = await self.crypto.subtle.importKey("raw", aesKey, "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
  let encriptedArrayBuffer = await self.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    encoded
  );
  var uint8View = new Uint8Array(encriptedArrayBuffer);
  var mergedArray = new Uint8Array(nonce.length + uint8View.length);
  mergedArray.set(nonce);
  mergedArray.set(uint8View, nonce.length);
  return mergedArray;
}

function base64ToArrayBuffer(base64) {
  var binary_string = self.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

const isLoggedIn = async (items) => {
  let flag = false;
  let newToken = "";

  const { refreshToken, expiresIn, userId } = items;

  if (expiresIn && expiresIn - 100000 > Date.now()) {
    flag = true;
  } else if (refreshToken && userId) {
    try {
      const { apiURL } = await getUrls();
      const apiURLAux = apiURL || API_ENDPOINT;

      const res = await fetch(`${apiURLAux}/user/refreshtoken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: refreshToken, username: userId }),
      });

      const responseJSON = await res.json();

      if (responseJSON && responseJSON.status === "Success") {
        chrome.storage.local.set({
          token: responseJSON.details.AuthenticationResult.AccessToken,
        });

        chrome.storage.local.set({
          expiresIn:
            responseJSON.details.AuthenticationResult.ExpiresIn * 1000 +
            Date.now(),
        });

        newToken = responseJSON.details.AuthenticationResult.AccessToken;
        flag = true;
      } else {
        flag = false;
      }
    } catch (error) {
      console.log("Error when trying to create a secret", error);
      chrome.storage.local.clear();
      return error;
    }
  }

  return { isLogged: flag, newToken };
};

createMenu();
