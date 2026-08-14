const holdings=[
{symbol:'NVDY',shares:14,buy:0},
{symbol:'QQQM',shares:0.759174,buy:0},
{symbol:'SCHD',shares:5,buy:0},
{symbol:'SPMO',shares:1.336567,buy:0},
{symbol:'SKADR',shares:3,buy:0},
];
const box=document.getElementById('stocks');
holdings.forEach(h=>{
 const d=document.createElement('div');
 d.className='stock';
 d.innerHTML=`<div class="row"><b>${h.symbol}</b><span id="${h.symbol}-price">--</span></div>
 보유 <input type="number" step="0.000001" value="${h.shares}"
 onchange="localStorage.setItem('shares_${h.symbol}',this.value)">
 매수가 <input type="number" step="0.01" value="${h.buy}"
 onchange="localStorage.setItem('buy_${h.symbol}',this.value)">
 <div id="${h.symbol}-change">--</div>`;
 box.appendChild(d);
});