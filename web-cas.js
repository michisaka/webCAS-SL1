import { states, rules, loadRuleFile, searchNextState } from "./cas.js";

let cellSize = 10;
let step = 0;
const cellTransition = document.querySelector("tbody#cell-transition");

const ruleFileInput = document.querySelector("input#rule-file");
ruleFileInput.addEventListener("change", async function (event) {
  if (event.target.files.length === 0) {
    return;
  }
  try {
    await loadRuleFile(event.target.files[0]);
    step = 0;
    setupStyleSheet(states);
    initializeStateTable();
    initializeRuleTable();
    initializeCellArray(cellSize);
  } catch (error) {
    alert(`遷移規則ファイルの読み込みに失敗しました。\n${error.message}`);
    event.target.value = null;
  }
});

const stepButton = document.querySelector("input#step-button");
stepButton.addEventListener("click", async function () {
  try {
    await stepForward();
  } catch (error) {
    alert(`${error.message}`);
  }
});

function setupStyleSheet(states) {
  while (document.styleSheets[1].cssRules.length > 0) {
    document.styleSheets[1].deleteRule(0);
  }

  for (const state of states) {
    let newStyle = `td[data-state="${state.name}"] { color: #${state.fgColor}; background-color: #${state.bgColor}; }`;
    document.styleSheets[1].insertRule(newStyle);
  }
}

function initializeStateTable() {
  const stateRows = document.querySelector("tbody#state-rows");
  stateRows.innerHTML = null;

  let stateCount = 0;
  for (const state of states) {
    const stateRow = document.createElement("tr");

    const stateName = document.createElement("td");
    stateName.dataset.state = state.name;
    stateName.textContent = state.name;
    stateName.classList.add("state-name");
    stateRow.append(stateName);

    const stateType = document.createElement("td");
    stateType.textContent = state.type;
    stateRow.append(stateType);

    if (state.type !== "external") {
      stateCount++;
    }

    stateRows.append(stateRow);
  }
  const totalStateText = document.querySelector("span#total-state-num");
  totalStateText.textContent = stateCount;
}

function initializeRuleTable() {
  const ruleRows = document.querySelector("tbody#rule-rows");
  ruleRows.innerHTML = null;

  rules.forEach((rule, i) => {
    const ruleRow = document.createElement("tr");
    ruleRow.dataset.rulenum = i;

    const ruleNum = document.createElement("th");
    ruleNum.textContent = i + 1;
    ruleRow.append(ruleNum);

    const leftState = document.createElement("td");
    leftState.dataset.state = rule.left;
    leftState.textContent = rule.left;
    leftState.classList.add("state-name");
    ruleRow.append(leftState);

    const currentState = document.createElement("td");
    currentState.dataset.state = rule.current;
    currentState.textContent = rule.current;
    currentState.classList.add("state-name");
    ruleRow.append(currentState);

    const rightState = document.createElement("td");
    rightState.dataset.state = rule.right;
    rightState.textContent = rule.right;
    rightState.classList.add("state-name");
    ruleRow.append(rightState);

    const gap = document.createElement("td");
    gap.textContent = "=>";
    ruleRow.append(gap);

    const nextState = document.createElement("td");
    nextState.dataset.state = rule.next;
    nextState.textContent = rule.next;
    nextState.classList.add("state-name");
    ruleRow.append(nextState);

    // const count = document.createElement("td");
    // count.textContent = rule.count;
    // count.classList.add("ref-count");
    // ruleRow.append(count);

    // const totalCount = document.createElement("td");
    // totalCount.textContent = rule.totalCount;
    // totalCount.classList.add("ref-count");
    // ruleRow.append(totalCount);

    ruleRows.append(ruleRow);
  });

  const totalRuleText = document.querySelector("span#total-rule-num");
  totalRuleText.textContent = rules.length;
}

function initializeCellArray(cellSize, generalPos = 0) {
  const cellArrayHeader = document.querySelector("tr#cell-array-header");

  const external = states.find((state) => state.type === "external");
  const general = states.find((state) => state.type === "general");
  const soldier = states.find((state) => state.type === "soldier");

  const externalTh = document.createElement("th");
  externalTh.classList.add("external");
  const externalTd = document.createElement("td");
  externalTd.dataset.state = external.name;
  externalTd.classList.add("external");

  cellTransition.innerHTML = null;
  cellArrayHeader.innerHTML = null;
  const firstTr = document.createElement("tr");
  firstTr.dataset.step = 0;

  cellArrayHeader.append(document.createElement("th"));
  const stepZeroTh = document.createElement("th");
  stepZeroTh.textContent = "0";
  stepZeroTh.classList.add("step-num");
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
      td.dataset.state = soldier.name;
      td.textContent = soldier.name;
    }
    td.dataset.pos = `${i + 1},0`;
    firstTr.append(td);
  }

  cellArrayHeader.append(externalTh.cloneNode());
  firstTr.append(externalTd.cloneNode());
  cellTransition.append(firstTr);
}

function stepForward() {
  return new Promise((resolve, reject) => {
    const external = states.find((state) => state.type === "external");
    const externalTd = document.createElement("td");
    externalTd.dataset.state = external.name;
    externalTd.classList.add("external");

    const currentRow = document.querySelector(`tr[data-step="${step}"]`);
    const newRow = document.createElement("tr");

    const stepTh = document.createElement("th");
    stepTh.textContent = step + 1;
    stepTh.classList.add("step-num");
    newRow.append(stepTh);

    newRow.append(externalTd.cloneNode());

    for (let i = 1; i <= cellSize; i++) {
      // th要素が存在するため 一つずれる
      let left = currentRow.children[i];
      let center = currentRow.children[i + 1];
      let right = currentRow.children[i + 2];

      let nextState, ruleNum;
      try {
        [nextState, ruleNum] = searchNextState(
          left.dataset.state,
          center.dataset.state,
          right.dataset.state,
        );
      } catch (error) {
        reject(new Error(error.message + ` step: ${step + 1}, pos: ${i}`));
        return;
      }

      let newCell = document.createElement("td");
      newCell.dataset.state = nextState;
      newCell.dataset.pos = `${i},${step + 1}`;
      newCell.textContent = nextState;
      newCell.dataset.rule = ruleNum;
      newRow.append(newCell);
    }

    newRow.append(externalTd.cloneNode());

    step += 1;
    newRow.dataset.step = step;
    cellTransition.append(newRow);
    resolve(step);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  step = 0;
  setupStyleSheet(states);
  initializeStateTable();
  initializeRuleTable();
  initializeCellArray(cellSize);
});
