export function initTraderState(container) {
  for (const [value,label] of [['calm','🟢 Tranquilo'],['anxious','🟡 Ansioso'],['revenge','🔴 Tentando recuperar perda']]) {
    const wrap=document.createElement('label'), input=document.createElement('input'), span=document.createElement('span');
    wrap.className='state'; input.type='radio'; input.name='trader-state'; input.value=value; span.textContent=label; wrap.append(input,span); container.append(wrap);
  }
}
