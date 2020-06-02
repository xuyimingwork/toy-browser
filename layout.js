function layout(element) {
  if (!element.computedStyle) return

  const style = getStyle(element)
  if (style.display !== 'flex') return

  !['width', 'height'].forEach(size => {
    if (!style[size] || style[size] === 'auto') {
      style[size] = null
    }
  })

  if (!style.flexDirection || style.flexDirection === 'auto') 
    style.flexDirection = 'row'
  if (!style.flexWrap || style.flexWrap === 'auto') 
    style.flexWrap = 'nowrap'
  if (!style.justifyContent || style.justifyContent === 'auto') 
    style.justifyContent = 'flex-start'
  if (!style.alignItems || style.alignItems === 'auto') 
    style.alignItems = 'stretch'
  if (!style.alignContent || style.alignContent === 'auto') 
    style.alignContent = 'stretch'

  console.log('element', style)
  console.log('children', element.children)
}

function getStyle(element) {
  if (!element.style) element.style = {}

  for (let prop in element.computedStyle) {
    element.style[prop] = element.computedStyle[prop].value

    const value = element.style[prop]
    if (value.toString().match(/px$/)
      || value.toString().match(/^[0-9\.]+$/)) {
      element.style[prop] = parseInt(value)
    }
  }

  return element.style
}

module.exports = layout