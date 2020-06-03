const css = require('css')
const layout = require('./layout')
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
    computeCSS(element)
    top.children.push(element)
    if (!token.isSelfClosing) stack.push(element)
    currentTextNode = null
  } else if (token.type === 'endTag') {
    if (top.tagName === token.tagName) {
      if (top.tagName === 'style') {
        addCSSRules(top.children[0].content)
      }
      layout(top)
      stack.pop()
    }
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

let rules = []

function addCSSRules(text) {
  const ast = css.parse(text)
  rules.push(...ast.stylesheet.rules)
}

function computeCSS(element) {
  const elements = stack.slice().reverse()
  if (!element.computedStyle) element.computedStyle = {}

  // 遍历每条 CSS 规则，看是否与当前元素匹配
  for (let rule of rules) {
    /**
     * 对于单条规则
     * 1. 只考虑单个选择器，不考虑逗号分隔的选择器组
     * 2. 只考虑以空格分隔的后代组合选择器，不考虑子元素、兄弟等组合选择器
     * 3. selectorParts 中各项均为简单选择器（只考虑 id、类、类型三种简单选择器）
     */
    const selectorParts = rule.selectors[0].split(' ').reverse()
    if (!match(element, selectorParts[0])) continue

    let matched = false

    let j = 1;
    for (let i = 0; i < elements.length; i++) {
      if (match(elements[i], selectorParts[j])) {
        j++
      }
    }

    // 若选择器的各部分简单选择器均匹配，则该条规则匹配
    if (j >= selectorParts.length) matched = true

    if (matched) {
      const sp = specificity(rule.selectors[0])
      const computedStyle = element.computedStyle
      for (let declaration of rule.declarations) {
        if (!computedStyle[declaration.property]) computedStyle[declaration.property] = {}
        if (!computedStyle[declaration.property].specificity 
          || compare(computedStyle[declaration.property].specificity, sp) <= 0){
              computedStyle[declaration.property].specificity = specificity(rule.selectors[0])
              computedStyle[declaration.property].value = declaration.value
          }
      }
    }
  }
}

/**
 * 判断元素与简单选择器是否匹配
 * @param {*} element 元素
 * @param {*} selector 简单选择器（id、类、类型）
 */
function match(element, selector) {
  if (!selector || !element.attributes) return false

  if (selector.charAt(0) === '#') {
    const attr = element.attributes.filter(attr => attr.name === 'id')[0]
    if (attr && attr.value === selector.replace('#', '')) return true
  } else if (selector.charAt(0) === '.') {
    const attr = element.attributes.filter(attr => attr.name === 'class')[0]
    if (attr && attr.value === selector.replace('.', '')) return true
  } else if (element.tagName === selector) {
    return true
  }

  return false
}

function specificity(selector) {
  const p = [0, 0, 0]
  const selectorParts = selector.split(' ')
  for (let part of selectorParts) {
    if (part.charAt(0) === '#') {
      p[0] += 1
    } else if (part.charAt(0) === '.') {
      p[1] += 1
    } else {
      p[2] += 1
    }
  }
  return p
}

function compare(sp1, sp2) {
  if (sp1[0] - sp2[0]) return sp1[0] - sp2[0]
  if (sp1[1] - sp2[1]) return sp1[1] - sp2[1]
  if (sp1[2] - sp2[2]) return sp1[2] - sp2[2]
  return 0
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
  state = state(EOF)
  return stack[0]
}