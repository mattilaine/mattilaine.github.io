(function () {
	var el = document.querySelector('#header h1');
	if (!el) return;
	var text = el.textContent;
	el.textContent = '';
	var i = 0;
	function type() {
		if (i < text.length) {
			el.textContent += text[i++];
			setTimeout(type, 100);
		} else {
			setTimeout(function () { el.classList.add('typed'); }, 800);
		}
	}
	type();
})();
