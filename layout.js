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

  let {
    mainSize, mainStart, mainEnd, mainSign, mainBase,
    crossSize, crossStart, crossEnd, crossSign, crossBase
  } = initAbstractAxisVariable(style)

  const flexLines = collectItemsIntoLines({
    style, children: element.children, mainSize, crossSize
  })

  calculateMainSize({ 
    flexLines, style, 
    mainSize, mainStart, mainEnd, mainSign, mainBase 
  })

  calculateCrossSize({
    flexLines, style,
    crossSize, crossStart, crossEnd, crossSign, crossBase
  })
}

function getStyle(element) {
  if (!element.style) element.style = {}
  else return element.style

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

function initAbstractAxisVariable(style) {
  let mainSize, mainStart, mainEnd, mainSign, mainBase,
      crossSize, crossStart, crossEnd, crossSign, crossBase;
  
  if (style.flexDirection === 'row') {
    mainSize = 'width';
    mainStart = 'left';
    mainEnd = 'right';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'height';
    crossStart = 'top'
    crossEnd = 'bottom'
  }

  if (style.flexDirection === 'row-reverse') {
    mainSize = 'width';
    mainStart = 'right';
    mainEnd = 'left';
    mainSign = -1;
    mainBase = style.width;

    crossSize = 'height';
    crossStart = 'top'
    crossEnd = 'bottom'
  }

  if (style.flexDirection === 'column') {
    mainSize = 'height';
    mainStart = 'top';
    mainEnd = 'bottom';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right'
  }

  if (style.flexDirection === 'column-reverse') {
    mainSize = 'height';
    mainStart = 'bottom';
    mainEnd = 'top';
    mainSign = -1;
    mainBase = style.height;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right'
  }

  if (style.flexWrap === 'nowrap') {
    crossBase = 0;
    crossSign = +1
  }

  if (style.flexWrap === 'wrap-reverse') {
    [crossStart, crossEnd] = [crossEnd, crossStart]
    crossBase = style[crossSize]
    crossSign = -1
  }

  return {
    mainSize, mainStart, mainEnd, mainSign, mainBase,
      crossSize, crossStart, crossEnd, crossSign, crossBase
  }
}

function collectItemsIntoLines({
  style, children, mainSize, crossSize
}) {
  const items = children
    .filter(node => node.type === 'element')
    .map(element => {
      getStyle(element)
      return element
    })
    .sort((a, b) => (a.style.order || 0) - (b.style.order || 0))

  let flexLine = []
  const flexLines = [flexLine]

  let mainSpace = style[mainSize]
  let crossSpace = 0
  
  for (item of items) {
    const itemStyle = getStyle(item)
    
    if (!itemStyle[mainSize]) {
      itemStyle[mainSize] = 0
    }

    if (style.flexWrap === 'nowrap') {
      // 一排情况
      flexLine.push(item)
    } else {
      // 可能单排或多排
      if (itemStyle[mainSize] > style[mainSize]) {
        itemStyle[mainSize] = style[mainSize]
      }

      if (itemStyle.flex) { 
        // 模型简化为扩张缩小均可的 flex
        flexLine.push(item)
      } else if (mainSpace >= itemStyle[mainSize]) {
        // 本行剩余空间可放下当前元素
        flexLine.push(item)
      } else {
        // 剩余空间不足放下当前元素，新开一排

        flexLine = [item]
        flexLines.push(flexLine)

        mainSpace = style[mainSize]
        crossSpace = 0
      }
    }

    mainSpace -= itemStyle[mainSize]
    if (itemStyle[crossSize]) {
      crossSpace = Math.max(crossSpace, itemStyle[crossSize])
    }

    // 本排主轴方向剩余空间
    flexLine.mainSpace = mainSpace
    // 本排交叉轴方向占据空间
    flexLine.crossSpace = crossSpace
  }

  return flexLines
}

function calculateMainSize({ 
  flexLines, style, 
  mainSize, mainStart, mainEnd, mainSign, mainBase,
}) {
  flexLines.forEach(flexLine => {
    // 获取本排剩余空间
    const mainSpace = flexLine.mainSpace

    // 获取本排 flex 值
    const flexTotal = flexLine.reduce((flexTotal, item) => {
      const itemStyle = getStyle(item)
      if (itemStyle.flex) flexTotal += itemStyle.flex
      return flexTotal
    }, 0)

    if (mainSpace < 0) {
      // 本排元素需要宽度超过容器宽度，等比缩小本排各元素
      const scale = style[mainSize] / (style[mainSize] - mainSpace)
      let currentMainPosition = mainBase
      flexLine.forEach(item => {
        const itemStyle = getStyle(item)
        if (itemStyle.flex) itemStyle[mainSize] = 0

        // 主轴方向尺寸等比缩小
        itemStyle[mainSize] = itemStyle[mainSize] * scale

        // 计算主轴方向元素位置（排列个元素）
        itemStyle[mainStart] = currentMainPosition
        itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
        currentMainPosition = itemStyle[mainEnd]
      })
    } else if (flexTotal > 0) {
      // 若本排存在剩余空间且存在 flex 元素
      let currentMainPosition = mainBase
      flexLine.forEach(item => {
        const itemStyle = getStyle(item)

        // flex 元素按比例分配本排剩余空间
        if (itemStyle.flex) itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex

        // 计算主轴方向元素位置（排列个元素）
        itemStyle[mainStart] = currentMainPosition
        itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
        currentMainPosition = itemStyle[mainEnd]
      })
    } else {
      // 若存在剩余空间且不存在 flex 元素，则 justifyContent 属性生效
      let currentMainPosition
      let gap
      const justifyContent = style.justifyContent

      if (justifyContent === 'flex-start') {
        currentMainPosition = mainBase
        gap = 0
      }

      if (justifyContent === 'flex-end') {
        currentMainPosition = mainSpace * mainSign + mainBase
        gap = 0
      }

      if (justifyContent === 'center') {
        currentMainPosition = mainSpace / 2 * mainSign + mainBase
        gap = 0
      }

      if (justifyContent === 'space-between') {
        currentMainPosition = mainBase
        gap = mainSpace / (flexLine.length - 1) * mainSign
      }

      if (justifyContent === 'space-around') {
        gap = mainSpace / flexLine.length * mainSign
        currentMainPosition = gap / 2 + mainBase
      }

      flexLine.forEach(item => {
        const itemStyle = getStyle(item)
        itemStyle[mainStart] = currentMainPosition
        itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
        currentMainPosition = itemStyle[mainEnd] + gap
      })
    }
  })
}

function calculateCrossSize({ 
  flexLines, style,
  crossSize, crossStart, crossEnd, crossSign, crossBase
}) {
  if (!style[crossSize]) {
    // 容器元素未设置交叉轴尺寸，容器元素交叉轴尺寸为各排之和
    element[crossSize] = flexLines.reduce((crossSize, flexLine) => {
      return crossSize += flexLine.crossSize
    }, 0)
  }

  // 若只有一排，撑开
  if (flexLines.length === 1) flexLines[0].crossSpace = style[crossSize] 

  // 计算剩余空间，存在剩余空间时依据 alignContent 计算各排位置
  let crossSpace = style[crossSize]
  flexLines.forEach(flexLine => crossSpace -= flexLine.crossSpace)
  let gap = 0
  if (crossSpace > 0 && style.flexWrap !== 'nowrap') {
    if (style.alignContent === 'flex-start') {
      crossBase += 0
      gap = 0
    }

    if (style.alignContent === 'flex-end') {
      crossBase += crossSign * crossSpace
      gap = 0
    }

    if (style.alignContent === 'center') {
      crossBase += (crossSign * crossSpace) / 2
      gap = 0
    }

    if (style.alignContent === 'space-between') {
      crossBase += 0
      gap = crossSpace / (flexLines.length - 1)
    }

    if (style.alignContent === 'space-around') {
      gap = crossSpace / flexLines.length
      crossBase += crossSign * gap / 2
    }

    // alignContent 为 stretch 时，将多余的空间分配到各排
    if (style.alignContent === 'stretch') {
      crossBase += 0
      gap = 0
      flexLines.forEach(flexLine => flexLine.crossSpace += crossSpace / flexLines.length)
    }
  }

  // 计算各排各元素交叉轴位置
  flexLines.forEach(flexLine => {
    const lineCrossSize = flexLine.crossSpace

    flexLine.forEach(item => {
      const itemStyle = getStyle(item)
      align = itemStyle.alignSelf || style.alignItems
  
      // 获取元素交叉轴尺寸
      if (!itemStyle[crossSize]) 
        itemStyle[crossSize] = align === 'stretch' ? lineCrossSize : 0
      
      // 对排内元素执行 align 计算
      if (align === 'flex-start') {
        itemStyle[crossStart] = crossBase
        itemStyle[crossEnd] = crossBase + crossSign * itemStyle[crossSize]
      } else if (align === 'flex-end') {
        itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize
        itemStyle[crossStart] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize]
      } else if (align === 'center') {
        itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize])
        itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
      } else if (align === 'stretch') {
        itemStyle[crossStart] = crossBase
        itemStyle[crossEnd] = crossBase + crossSign * itemStyle[crossSize]
      }
    })
  
    crossBase += crossSign * (lineCrossSize + gap)
  })
}

module.exports = layout