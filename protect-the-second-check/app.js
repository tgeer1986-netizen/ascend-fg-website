document.addEventListener('DOMContentLoaded',function(){
  var button=document.getElementById('calculateButton');
  if(!button)return;
  button.addEventListener('click',function(){
    var monthly=Number(document.getElementById('monthlyGap').value);
    var years=Number(document.querySelector('input[name="bridge_years"]:checked').value);
    var total=monthly*12*years;
    document.getElementById('resultAmount').textContent=total.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  });
});
