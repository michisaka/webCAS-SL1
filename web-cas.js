import { states } from "./cas.js";

let cellSize = 10;
const cellTransition = document.querySelector("tbody#cell-transition");

function setupStyleSheet(states) {
  while (document.styleSheets[1].cssRules.length > 0) {
    document.styleSheets[1].deleteRule(0);
  }

  for (const state of states) {
    let newStyle = `table.cell-table td[data-state="${state.name}"] { color: #${state.fgColor}; background-color: #${state.bgColor}; }`;
    document.styleSheets[1].insertRule(newStyle);
  }
}

function initializeCellArray(cellSize, generalPos = 0) {
  const cellArrayHeader = document.querySelector("tr#cell-array-header");

  const external = states.find((state) => state.type === "external");
  const general = states.find((state) => state.type === "general");
  const soldire = states.find((state) => state.type === "soldire");

  const externalTh = document.createElement("th");
  externalTh.classList.add("external");
  const externalTd = document.createElement("td");
  externalTd.dataset.state = external.name;
  externalTd.classList.add("external");

  cellTransition.innerHTML = null;
  cellArrayHeader.innerHTML = null;
  const firstTr = document.createElement("tr");

  cellArrayHeader.append(document.createElement("th"));
  const stepZeroTh = document.createElement("th");
  stepZeroTh.textContent = "0";
  firstTr.append(stepZeroTh);

  cellArrayHeader.append(externalTh.cloneNode());
  firstTr.append(externalTd.cloneNode());

  for (let i = 0; i < cellSize; i++) {
    const th = document.createElement("th");
    th.textContent = i + 1;
    cellArrayHeader.append(th);

    const td = document.createElement("td");
    if (i === generalPos) {
      td.dataset.state = general.name;
      td.textContent = general.name;
    } else {
      td.dataset.state = soldire.name;
      td.textContent = soldire.name;
    }
    firstTr.append(td);
  }

  cellArrayHeader.append(externalTh.cloneNode());
  firstTr.append(externalTd.cloneNode());
  cellTransition.append(firstTr);
}

document.addEventListener("DOMContentLoaded", () => {
  setupStyleSheet(states);
  initializeCellArray(cellSize);
});
