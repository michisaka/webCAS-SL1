export { states, rules, loadRuleFile, searchNextState };

let states = [
  { name: "G", type: "general", bgColor: "FFFF00", fgColor: "000000" },
  { name: "Q", type: "soldier", bgColor: "FFFFFF", fgColor: "000000" },
  { name: "A", type: "others", bgColor: "FF5555", fgColor: "000000" },
  { name: "F", type: "firing", bgColor: "FF9900", fgColor: "000000" },
  { name: "w", type: "external", bgColor: "808080", fgColor: "000000" },
];

let rules = [
  { left: "w", current: "G", right: "Q", next: "G", count: 0, totalCount: 0 },
  { left: "G", current: "Q", right: "Q", next: "Q", count: 0, totalCount: 0 },
  { left: "Q", current: "Q", right: "Q", next: "Q", count: 0, totalCount: 0 },
  { left: "Q", current: "Q", right: "w", next: "Q", count: 0, totalCount: 0 },
];

const ruleMap = new Map();
rules.forEach((rule, index) => {
  let currentState = `${rule.left}\0${rule.current}\0${rule.right}`;
  ruleMap.set(currentState, index);
});

function loadRuleFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", (event) => {
      const lines = event.target.result.split(/[\r\n]+/);

      try {
        resolve(readLines(lines));
      } catch (error) {
        reject(error);
      }
    });

    reader.readAsText(file);
  });
}

function readLines(lines) {
  const STATE_PATTERN = /^state_number\s+\d+\s*$/;
  const GENERAL_PATTERN = /^general_number\s+\d+\s*$/;
  const RULE_PATTERN = /^rule_number\s+\d+\s*$/;

  const stateNames = new Set();
  const usedStateTypes = new Set();

  const definedRules = new Set();

  const tempStates = [];
  const tempRules = [];

  let parser;

  if (lines[0] !== "SL1rule") {
    reject(
      new Error(`ルール種別を識別できませんでした。 1行目: "${lines[0]}""`),
    );
  }

  let lineNum;
  for (lineNum = 1; lineNum < lines.length; lineNum++) {
    if (/^\s*$/.test(lines[lineNum])) {
      continue;
    }

    if (STATE_PATTERN.test(lines[lineNum])) {
      parser = stateParser;
      continue;
    }
    if (GENERAL_PATTERN.test(lines[lineNum])) {
      parser = generalParser;
      continue;
    }
    if (RULE_PATTERN.test(lines[lineNum])) {
      parser = ruleParser;
      continue;
    }

    parser(lines[lineNum]);
  }

  const mustStateTypes = new Set([
    "external",
    "general",
    "soldier",
    "others",
    "firing",
  ]);

  const undefinedStateTypes = mustStateTypes.difference(usedStateTypes);
  if (undefinedStateTypes.size !== 0) {
    throw new Error(
      `状態"${undefinedStateTypes.values().toArray().join(",")}"が定義されていません。"`,
    );
  }
  states = tempStates;
  rules = tempRules;

  ruleMap.clear();
  rules.forEach((rule, index) => {
    let currentState = `${rule.left}\0${rule.current}\0${rule.right}`;
    ruleMap.set(currentState, index);
  });

  return;

  function stateParser(line) {
    const STATE_LINE_PATTERN =
      /^(?<name>\S{1,5})\s*@(?<fg>[0-9A-F]{6}),(?<bg>[0-9A-F]{6}),(?<type>\S+)$/;

    const result = line.match(STATE_LINE_PATTERN);
    if (!result) {
      throw new Error(
        `状態の読み込みに失敗しました。 ${lineNum + 1}行目: "${lines[lineNum]}"`,
      );
    }

    const bg = result.groups.bg;
    const fg = result.groups.fg;
    const state = {
      name: result.groups.name,
      type: result.groups.type,
      bgColor: [bg[4], bg[5], bg[2], bg[3], bg[0], bg[1]].join(""),
      fgColor: [fg[4], fg[5], fg[2], fg[3], fg[0], fg[1]].join(""),
    };

    if (stateNames.has(state.name)) {
      throw new Error(
        `状態名"${state.name}"はすでに定義されています。 ${lineNum + 1}行目: "${lines[lineNum]}"`,
      );
    } else {
      stateNames.add(state.name);
    }

    if (state.type !== "others" && usedStateTypes.has(state.type)) {
      throw new Error(
        `状態"${state.type}"はすでに定義されています。 ${lineNum + 1}行目: "${lines[lineNum]}"`,
      );
    } else {
      usedStateTypes.add(state.type);
    }

    tempStates.push(state);
  }

  function generalParser(_) {
    /* do notiong. */
  }

  function ruleParser(line) {
    const RULE_LINE_PATTERN =
      /^(?<left>\S{1,5})\s*##(?<current>\S{1,5})\s*##(?<right>\S{1,5})\s*->(?<next>\S{1,5})\s*$/;

    const result = line.match(RULE_LINE_PATTERN);
    if (!result) {
      throw new Error(
        `遷移規則の読み込みに失敗しました。 ${lineNum + 1}行目: "${lines[lineNum]}"`,
      );
    }

    const left = result.groups.left;
    const current = result.groups.current;
    const right = result.groups.right;
    const next = result.groups.next;

    [left, current, right, next].forEach((name) => {
      if (!stateNames.has(name)) {
        throw new Error(
          `未定義の状態名"${name}"が使用されました。 ${lineNum + 1}行目: "${lines[lineNum]}"`,
        );
      }
    });

    const currentState = `${left}\0${current}\0${right}`;

    if (definedRules.has(currentState)) {
      throw new Error(
        `同じ近傍状態の遷移規則がすでに定義されています。 ${lineNum + 1}行目: "${lines[lineNum]}"`,
      );
    } else {
      definedRules.add(currentState);
    }

    tempRules.push({
      left: left,
      current: current,
      right: right,
      next: next,
      count: 0,
      totalCount: 0,
    });
  }
}

function searchNextState(left, current, right) {
  const currentState = `${left}\0${current}\0${right}`;

  const index = ruleMap.get(currentState);
  if (index === undefined) {
    throw new Error(
      `未定義の遷移規則が参照されました。 left: ${left}, current: ${current}, right:${right}`,
    );
  }
  const rule = rules[index];
  rule.count++;

  return [rule.next, index];
}
