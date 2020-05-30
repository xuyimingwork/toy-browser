const EOF = Symbol('EOF') // End Of File

let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;

const stack = [{ type: 'document', children: [] }]

function emit(token) {  
  const top = stack[stack.length - 1]
  if (token.type === 'startTag') {
    const element = {
      type: 'element',
      tagName: token.tagName,
      // parent: top,
      children: [],
      attributes: token.attributes
    }
    top.children.push(element)
    if (!token.isSelfClosing) stack.push(element)
    currentTextNode = null
  } else if (token.type === 'endTag') {
    if (top.tagName === token.tagName) stack.pop()
    else throw Error()
    currentTextNode = null
  } else if (token.type === 'text') {
    if (!currentTextNode) {
      currentTextNode = {
        type: 'text',
        content: ''
      }
      top.children.push(currentTextNode)
    }
    currentTextNode.content += token.content
  }
}

function data(c) {
  if (c === '<') {
    return tagOpen 
  } else if (c === EOF) {
    emit({
      type: 'EOF'
    })
    return;
  } else {
    emit({
      type: 'text',
      content: c
    })
    return data
  }
}

function tagOpen(c) {
  if (c === '/') {
    // 结束标签如 </style>
    return endTagOpen
  } else if (c.match(/^[a-zA-Z]$/)) {
    // 切换至 tagName 状态，让 tagName 状态重新 consume 当前字符
    currentToken = {
      type: 'startTag',
      tagName: '',
      attributes: []
    }
    return tagName(c)
  } else {
    throw new Error()
  }
}

function endTagOpen(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'endTag',
      tagName: ''
    }
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
    emit(currentToken)
    return data
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += c.toLowerCase()
    return tagName
  } else {
    throw Error('')
  }
}

function beforeAttributeName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName
  } else if (c === '/' || c === '>' || c === EOF) {
    return afterAttributeName(c)
  } else if (c === '=') {
    throw Error()
  } else {
    currentAttribute = {
      name: '',
      value: ''
    }
    return attributeName(c)
  }
}

function attributeName(c) {
  if (c === EOF || c.match(/^[\t\n\f \/>]$/)) {
    return afterAttributeName(c)
  } else if (c === '=') {
    return beforeAttributeValue
  } else {
    currentAttribute.name += c.toLowerCase()
    return attributeName
  }
}

function afterAttributeName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return afterAttributeName
  } else if (c === '/') {
    return selfClosingStartTag
  } else if (c === '=') {
    return beforeAttributeValue
  } else if (c === '>') {
    emit(currentToken)
    return data
  } else if (c === EOF) {
    throw Error()
  } else {
    currentAttribute = {
      name: '',
      value: ''
    }
    return attributeName(c)
  }
}

function beforeAttributeValue(c) {
  if (c.match(/^[\t\n\f \/>]$/)) {
    return beforeAttributeValue
  } else if (c === '"') {
    return doubleQuotedAttributeValue
  } else if (c === '\'') {
    return singleQuotedAttributeValue
  } else if (c === '>') {
    throw Error()
  } else {
    return unquotedAttributeValue(c)
  }
}

function doubleQuotedAttributeValue(c) {
  if (c === '"') {
    currentToken.attributes.push(currentAttribute)
    return afterQuotedAttributeValue 
  } else if (c === '\u0000') {
    throw Error()
  } else if (c === EOF) {
    
  } else {
    currentAttribute.value += c
    return doubleQuotedAttributeValue
  }
}

function singleQuotedAttributeValue(c) {
  if (c === '\'') {
    currentToken.attributes.push(currentAttribute)
    return afterQuotedAttributeValue
  } else if (c === '\u0000') {
    throw Error()
  } else if (c === EOF) {
    
  } else {
    currentAttribute.value += c
    return singleQuotedAttributeValue
  }
}

function unquotedAttributeValue(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    currentToken.attributes.push(currentAttribute)
    return beforeAttributeName
  } else if (c === '/') {
    currentToken.attributes.push(currentAttribute)
    return selfClosingStartTag
  } else if (c === '>') {
    currentToken.attributes.push(currentAttribute)
    emit(currentToken)
    return data
  } else if (c === '\u0000') {
    throw Error()
  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return unquotedAttributeValue
  }
}

function afterQuotedAttributeValue(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName
  } else if (c === '/') {
    return selfClosingStartTag
  } else if (c === '>') {
    emit(currentToken)
    return data
  } else if (c === EOF) {

  } else {
    throw Error()
  }
}

function selfClosingStartTag(c) {
  if (c === '>') {
    currentToken.isSelfClosing = true
    emit(currentToken)
    return data
  } else {
    throw Error('')
  }
}

module.exports.parseHTML = function(html) {
  let state = data
  for (let c of html) {
    state = state(c)
  }
  console.log(JSON.stringify(stack[0], null, 2))
  state = state(EOF)
}