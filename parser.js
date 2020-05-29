const EOF = Symbol('EOF') // End Of File

function data(c) {
  if (c === '<') {
    return tagOpen 
  } else if (c === EOF) {
    return;
  } else {
    return data
  }
}

function tagOpen(c) {
  if (c === '/') {
    // 结束标签如 </style>
    return endTagOpen
  } else if (c.match(/^[a-zA-Z]$/)) {
    // 切换至 tagName 状态，让 tagName 状态重新 consume 当前字符
    return tagName(c)
  } else {
    throw new Error()
  }
}

function endTagOpen(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    return tagName(c)
  } else {
    throw Error('')
  }
}

function tagName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName
  } else if (c === '/') {
    // 当 / 紧邻名字时，如 <img/>
    return selfClosingStartTag
  } else if (c === '>') {
    return data
  } else if (c.match(/^[a-zA-Z]$/)) {
    return tagName
  } else {
    throw Error('')
  }
}

function beforeAttributeName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName
  } else if (c === '>') {
    return data
  } else {
    return beforeAttributeName
  }
}

function selfClosingStartTag(c) {
  if (c === '>') {
    return data
  } else {
    throw Error('')
  }
}

module.exports.parseHTML = function(html) {
  let state = data
  for (let c of html) {
    console.log(state.name, JSON.stringify(c))
    state = state(c)
  }
  state = state(EOF)
}