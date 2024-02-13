const sharepassExtModalId = "sharepassExtModal";
const heartFill =
  "M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z";
const heartEmpty =
  "M458.4 64.3C400.6 15.7 311.3 23 256 79.3 200.7 23 111.4 15.6 53.6 64.3-21.6 127.6-10.6 230.8 43 285.5l175.4 178.7c10 10.2 23.4 15.9 37.6 15.9 14.3 0 27.6-5.6 37.6-15.8L469 285.6c53.5-54.7 64.7-157.9-10.6-221.3zm-23.6 187.5L259.4 430.5c-2.4 2.4-4.4 2.4-6.8 0L77.2 251.8c-36.5-37.2-43.9-107.6 7.3-150.7 38.9-32.7 98.9-27.8 136.5 10.5l35 35.7 35-35.7c37.8-38.5 97.8-43.2 136.5-10.6 51.1 43.1 43.5 113.9 7.3 150.8z";
let lastElement;
let selectionStart;
let selectionEnd;

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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(request.message, new Date());
  if (sender.id == chrome.runtime.id) {
    let response = { status: true };
    switch (request.message) {
      case "replaceSelectedText":
        replaceSelectedText(request.text, request.clickable, request.id);
        break;
      case "insertSpinner":
        insertSpinner(document.activeElement, request.id);
        break;
      case "updateLocalStorage":
        response = updateStorage();
        break;
      case "removeSpinner":
        replaceWithOldText(request.text, request.id, request.errorMessage);
        break;
      case "showTemplates":
        showTemplates(request.templates, request.id, request.info, request.tab);
        break;
      case "checkSpinnerInput":
        response = checkSpinnerInput(request.id);
        break;
    }

    sendResponse(response);
  }

  return true;
});

function showTemplates(templates, id, info, tab) {
  let modalExists = document.getElementById(sharepassExtModalId);

  const templatesQty = templates.length;

  if (!modalExists && window.self === window.top) {
    let modalClose = document.createElement("span");
    modalClose.innerHTML = "&times;";
    modalClose.classList.add("sharepass-ext-close");
    modalClose.onclick = function () {
      let modalTemp = document.getElementById(sharepassExtModalId);
      modalTemp.style.display = "none";

      document.body.removeChild(modalTemp);

      replaceWithOldText(info.selectionText, id);
    };

    let modalTitle = document.createElement("h6");
    modalTitle.innerText = "Templates";

    let modalHr = document.createElement("hr");

    let modalTemplateList = document.createElement("div");
    modalTemplateList.classList.add("alert");
    modalTemplateList.classList.add("sharepass-ext-template-list");

    let modalTemplateListEmpty = document.createElement("div");
    modalTemplateListEmpty.innerHTML = "No templates found";
    modalTemplateListEmpty.id = "sharepass-ext-templates-empty";

    if (templatesQty) {
      for (let i = 0; i < templatesQty; i++) {
        /*let modalTemplateInner = document.createElement("div");
        modalTemplateInner.innerHTML = templates[i].codeName;
        modalTemplateInner.onclick = function () {
          createSecretFromTemplate(templates[i].details);
        };*/
        let modalTemplate = document.createElement("div");

        if (templates[i].starred) {
          let favHeart = createHeart();
          modalTemplate.appendChild(favHeart);
          modalTemplate.classList.add("starred");
        }

        let templateName = templates[i].codeName;
        let numUpper =
          templateName.length -
          templateName.replace(/[A-Z]/g, "").length -
          (templateName.split(" ").length - 1);
        let numLower = templateName.length - numUpper;

        if (numUpper * 2 + numLower > 30) {
          if (numUpper > 10) {
            templateName = templateName.substring(0, 17) + "...";
          } else {
            templateName = templateName.substring(0, 25) + "...";
          }

          let divContainerTooltip = document.createElement("div");
          divContainerTooltip.classList.add("sharepass-ext-modal-tooltip");

          let spanTooltip = document.createElement("span");
          spanTooltip.classList.add("sharepass-ext-modal-tooltiptext");
          spanTooltip.innerHTML = templates[i].codeName;

          divContainerTooltip.innerHTML = templateName;
          divContainerTooltip.appendChild(spanTooltip);

          modalTemplate.appendChild(divContainerTooltip);
        } else {
          modalTemplate.innerHTML += templateName;
        }

        modalTemplate.onclick = function () {
          createSecretFromTemplate(templates[i].globalId ? templates[i].globalId : templates[i].codeName, id, info, tab);
        };
        modalTemplate.classList.add("sharepass-ext-template");
        //modalTemplate.appendChild(modalTemplateInner);

        modalTemplateList.appendChild(modalTemplate);
      }
      modalTemplateListEmpty.style.display = "none";
    }

    modalTemplateList.appendChild(modalTemplateListEmpty);

    let modalInput = document.createElement("input");
    modalInput.type = "text";
    modalInput.placeholder = "Filter";
    modalInput.id = "sharepass-ext-search";
    modalInput.classList.add("sharepass-ext-search");
    modalInput.onkeyup = filterTemplates;

    let modalInputContainer = document.createElement("div");
    modalInputContainer.id = "sharepass-ext-search-container";
    modalInputContainer.classList.add("sharepass-ext-search-container");
    modalInputContainer.appendChild(modalInput);

    let heartFav = createHeart(false, "sharepass-ext-heart-svg");
    let modalHeartContainer = document.createElement("div");
    modalHeartContainer.classList.add("sharepass-ext-heart");
    modalHeartContainer.id = "sharepass-ext-heart";
    modalHeartContainer.appendChild(heartFav);
    modalHeartContainer.onclick = filterTemplates;

    let modalFilterImg = document.createElement("img");
    modalFilterImg.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/wD/AP+gvaeTAAAAoElEQVRIid2UUQrCMBAF30r1EB7YSvEUnk0p6B0cf4pEEptsUzQ433m7Cxme9NcAW+AE3IErcAR2ay4YiOk9MywYRmFmNLN9LmNmJkkbzzUTD8/j1wJLIGlIZM5zmSCbB+imf7gBF+Cw6if/hObUXaJpikjdGk1TfFR3VtMadRef2r66zWmYo1TTogZ9G+zU1NWgIZGmqmjQojZtX8Nv8wQzmOQozSjzHwAAAABJRU5ErkJggg==";
    modalFilterImg.onclick = function () {
      document
        .getElementById("sharepass-ext-search-container")
        .classList.toggle("sharepass-ext-search-container-show");
      document
        .getElementById("sharepass-ext-heart")
        .classList.toggle("sharepass-ext-heart-show");
    };

    let modalFilterImgContainer = document.createElement("div");
    modalFilterImgContainer.classList.add("sharepass-ext-filter-ico");
    modalFilterImgContainer.appendChild(modalFilterImg);

    let modalFilterWrapper = document.createElement("div");
    modalFilterWrapper.classList.add("sharepass-ext-filter-wrapper");
    modalFilterWrapper.appendChild(modalFilterImgContainer);
    modalFilterWrapper.appendChild(modalInputContainer);
    modalFilterWrapper.appendChild(modalHeartContainer);

    let modalContent = document.createElement("div");
    modalContent.classList.add("sharepass-ext-modal-content");
    modalContent.appendChild(modalClose);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(modalHr);
    modalContent.appendChild(modalFilterWrapper);
    modalContent.appendChild(modalTemplateList);

    let modal = document.createElement("div");
    modal.id = sharepassExtModalId;
    modal.classList.add("sharepass-ext-modal");
    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    let modalAdded = document.getElementById(sharepassExtModalId);
    modalAdded.style.display = "block";
  }
}

function isUpperCase(character) {
  if (character == character.toUpperCase) return true;
  else return false;
}

function isLowerCase(character) {
  if (character == character.toLowerCase) return true;
  else return false;
}

function filterTemplates(event) {
  const idTrigger = event.target.id;
  let allElements = document.querySelectorAll(".sharepass-ext-template");
  let hiddens = 0;

  let elementSVG = document.getElementById("sharepass-ext-heart-svg");

  if (idTrigger != "sharepass-ext-search") {
    elementSVG.classList.toggle("active");
  }

  let onlyFav = elementSVG.classList.contains("active");

  let path = document.getElementById("sharepass-ext-heart-svg-path");

  if (onlyFav) {
    path.setAttribute("d", heartFill);
  } else {
    path.setAttribute("d", heartEmpty);
  }

  for (let item of allElements) {
    if (
      item.textContent
        .toLowerCase()
        .includes(
          document.getElementById("sharepass-ext-search").value.toLowerCase()
        ) &&
      ((onlyFav && item.classList.contains("starred")) || !onlyFav)
    ) {
      item.style.display = "";
    } else {
      item.style.display = "none";
      hiddens++;
    }
  }

  let emptyList = document.getElementById("sharepass-ext-templates-empty");

  if (hiddens == allElements.length) {
    emptyList.style.display = "block";
  } else {
    emptyList.style.display = "none";
  }
}

function createHeart(fill = true, id = null) {
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  let svgNS = svg.namespaceURI;
  let path = document.createElementNS(svgNS, "path");
  if (fill) {
    path.setAttribute("d", heartFill);
  } else {
    path.setAttribute("d", heartEmpty);
  }
  path.setAttribute("fill", "currentColor");

  if (id) {
    svg.id = id;
    path.id = `${id}-path`;
  }

  svg.appendChild(path);
  svg.setAttribute("color", "#1d8cf8");

  svg.setAttribute("viewBox", "0 0 512 512");

  return svg;
}

async function createSecretFromTemplate(codeName, id, info, tab) {
  let modalTemp = document.getElementById(sharepassExtModalId);
  modalTemp.style.display = "none";

  document.body.removeChild(modalTemp);

  chrome.runtime.sendMessage(
    {
      message: "createSecretFromTemplate",
      codeName: codeName,
      id: id,
      info: info,
      tab: tab,
    },
    () => {}
  );
}

function replaceSelectedText(text, clickable, id) {
  if (lastElement) {
    lastElement.disabled = false;

    lastElement.value = replaceRange(
      lastElement.value,
      selectionStart,
      selectionEnd,
      text
    );

    lastElement = null;
    selectionStart = null;
    selectionEnd = null;
  } else {
    var div = document.getElementById(id);

    if (div) {
      div.classList.remove("loader");

      const anchor = document.createElement("a");
      anchor.href = text;
      anchor.innerText = clickable;

      div.replaceWith(anchor);

      var contentEditables = document.querySelectorAll(
        "[contenteditable=true]"
      );
    }
  }
}

function replaceWithOldText(text, id, errorMessage = null) {
  if (lastElement) {
    lastElement.disabled = false;
    lastElement = null;
    selectionStart = null;
    selectionEnd = null;
  } else {
    var div = document.getElementById(id);
    if (div) {
      div.classList.remove("loader");

      if (!text) {
        text = "";
      }

      const para = document.createTextNode(text);

      div.replaceWith(para);
    }
  }

  if (errorMessage) {
    showModalBlock("ERROR", errorMessage, "alert");
  }
}

function showModalBlock(title, content, style) {
  let modalExists = document.getElementById(sharepassExtModalId);

  if (!modalExists && window.self === window.top) {
    let modalClose = document.createElement("span");
    modalClose.innerHTML = "&times;";
    modalClose.classList.add("sharepass-ext-close");
    modalClose.onclick = function () {
      let modalTemp = document.getElementById(sharepassExtModalId);
      modalTemp.style.display = "none";

      document.body.removeChild(modalTemp);
    };

    let modalTitle = document.createElement("h6");
    modalTitle.innerText = title;

    let modalHr = document.createElement("hr");

    let modalMessage = document.createElement("div");
    modalMessage.classList.add("alert");
    modalMessage.classList.add(style);
    modalMessage.innerHTML = content;

    let modalContent = document.createElement("div");
    modalContent.classList.add("sharepass-ext-modal-content");
    modalContent.appendChild(modalClose);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(modalHr);
    modalContent.appendChild(modalMessage);

    let modal = document.createElement("div");
    modal.id = sharepassExtModalId;
    modal.classList.add("sharepass-ext-modal");
    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    let modalAdded = document.getElementById(sharepassExtModalId);
    modalAdded.style.display = "block";
  }
}

function replaceRange(s, start, end, substitute) {
  return s.substring(0, start) + substitute + s.substring(end);
}

function insertSpinner(elem, id) {
  const tagName = elem.tagName.toLowerCase();

  try {
    if (tagName === "textarea" || tagName === "input") {
      lastElement = elem;
      selectionStart = elem.selectionStart;
      selectionEnd = elem.selectionEnd;
      elem.disabled = true;
    } else {
      document.execCommand(
        "insertHTML",
        false,
        `<div class="loader" id="${id}"><div></div><div></div><div></div></div>`
      );
    }
  } catch (err) {
    console.log(err);
  }
}

function checkSpinnerInput(id) {
  if (lastElement) {
    return { status: true };
  } else {
    var element = document.getElementById(id);

    if (typeof element != "undefined" && element != null) {
      return { status: true };
    } else {
      return { status: false };
    }
  }
}

function updateStorage() {
  // if (
  //   location.host == "app.sharepass.com" ||
  //   location.host == "secure.ymtech.com" ||
  //   location.host.includes("sharepass.com")
  // )
  if (DOMAINS.includes(location.host)) {
    const items = { ...localStorage };

    return {
      status: true,
      message: "updateSharePassLocalStorage",
      sessionData: JSON.stringify(items),
    };
  }
}
