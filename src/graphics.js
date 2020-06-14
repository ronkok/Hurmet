import { dt } from "./constants"
import { Rnl } from "./rational"

export const lineChart = (args) => {
  const [xOp, yOp, title, xLabel, yLabel] = args
  const x = xOp.value
  const y = yOp.value
  const config = {
    type: "line",
    data: {  datasets: undefined },
    options: {
      responsive: true,
      legend: false,
      title: {
        display: true,
        text: title.value
      },
      tooltips: {
        mode: 'index'
      },
      scales: {
        xAxes: [{
          type: "linear",
          display: true,
          scaleLabel: {
            display: true,
            labelString: xLabel.value
          }
        }],
        yAxes: [{
          type: "linear",
          display: true,
          scaleLabel: {
            display: true,
            labelString: yLabel.value
          }
        }]
      }
    }
  }
  let datasets
  if (Rnl.isRational(y[0])) {
    datasets = new Array(1)
    const data = new Array(x.length)
    for (let i = 0; i < y.length; i++) {
      data[i] = { x: Rnl.toNumber(x[i]), y: Rnl.toNumber(y[i]) }
    }
    datasets[0] = { data: data, fill: false, borderColor: "#000", borderWiidth: 2 }
  } else {
    datasets = new Array(y.length)
    for (let i = 0; i < y.length; i++) {
      const data = new Array(x.length)
      for (let j = 0; j < x.length; j++) {
        data[j] = { x: Rnl.toNumber(x[j]), y: Rnl.toNumber(y[i][j]) }
      }
      datasets[i] = { data: data, fill: false, borderColor: "#000", borderWiidth: 2 }
    }
  }
  config.data.datasets = datasets
  return { value: config, unit: undefined, dtype: dt.IMAGE }
}
