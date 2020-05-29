const EOF = Symbol('EOF') // End Of File

function data(c) {
  console.log(JSON.stringify(c))
  return data
}

module.exports.parseHTML = function(html) {
  let state = data
  for (let c of html) {
    state = state(c)
  }
  state = state(EOF)
}