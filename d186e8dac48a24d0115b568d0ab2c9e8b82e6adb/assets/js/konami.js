(function () {
	var sequence = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
	var index = 0;

	if (new URLSearchParams(window.location.search).get('gaming') === '1') {
		history.replaceState(null, '', window.location.pathname);
		document.addEventListener('DOMContentLoaded', triggerKonami);
		if (document.readyState !== 'loading') triggerKonami();
	}

	document.addEventListener('keydown', function (e) {
		if (e.key === sequence[index]) {
			index++;
			if (index === sequence.length) {
				index = 0;
				triggerKonami();
			}
		} else {
			index = e.key === sequence[0] ? 1 : 0;
		}
	});

	function triggerKonami() {
		if (document.getElementById('gaming-center')) return;

		var overlay = document.createElement('div');
		overlay.id = 'gaming-center';
		overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,10,15,0.95);font-family:"Courier New",monospace;';

		var scanlines = document.createElement('div');
		scanlines.style.cssText = 'position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 3px);pointer-events:none;z-index:1;';
		overlay.appendChild(scanlines);

		var content = document.createElement('div');
		content.style.cssText = 'position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;padding:2rem;width:100%;max-width:480px;';

		var title = document.createElement('div');
		title.textContent = '// GAMING CENTER';
		title.style.cssText = 'font-size:clamp(1.4rem,5vw,2.4rem);letter-spacing:0.2em;color:#00fff7;text-shadow:0 0 14px #00fff7,0 0 30px rgba(0,255,247,0.3);margin-bottom:0.5rem;text-align:center;';

		var subtitle = document.createElement('div');
		subtitle.textContent = 'WHICH GAME DO YOU WANT TO PLAY?';
		subtitle.style.cssText = 'font-size:0.72rem;letter-spacing:0.18em;color:rgba(0,255,247,0.4);margin-bottom:3rem;text-align:center;';

		var list = document.createElement('div');
		list.style.cssText = 'display:flex;flex-direction:column;gap:0.75rem;width:100%;';

		var games = [
			{ num: '01', label: 'TETRIS', href: 'games/tetris.html' },
		];

		games.forEach(function(g) {
			var card = document.createElement('div');
			card.style.cssText = 'border:1px solid rgba(0,255,247,0.25);padding:1.1rem 1.5rem;cursor:pointer;display:flex;align-items:center;gap:1rem;transition:border-color 0.2s,background 0.2s,box-shadow 0.2s;';
			card.innerHTML = '<span style="font-size:0.7rem;color:rgba(0,255,247,0.4);">' + g.num + '</span>'
				+ '<span style="font-size:1rem;letter-spacing:0.15em;font-weight:bold;color:#00fff7;">' + g.label + '</span>'
				+ '<span style="margin-left:auto;color:rgba(0,255,247,0.4);">›</span>';
			card.addEventListener('mouseover', function() {
				this.style.borderColor = '#00fff7';
				this.style.background = 'rgba(0,255,247,0.06)';
				this.style.boxShadow = '0 0 18px rgba(0,255,247,0.15)';
			});
			card.addEventListener('mouseout', function() {
				this.style.borderColor = 'rgba(0,255,247,0.25)';
				this.style.background = 'transparent';
				this.style.boxShadow = 'none';
			});
			card.addEventListener('click', function(e) {
				e.stopPropagation();
				window.location.href = g.href;
			});
			list.appendChild(card);
		});

		content.appendChild(title);
		content.appendChild(subtitle);
		content.appendChild(list);
		overlay.appendChild(content);

		var closeBtn = document.createElement('button');
		closeBtn.textContent = 'ESC';
		closeBtn.style.cssText = 'position:absolute;top:1.5rem;right:1.5rem;font-family:"Courier New",monospace;font-size:0.7rem;letter-spacing:0.12em;color:rgba(0,255,247,0.3);background:none;border:1px solid rgba(0,255,247,0.15);padding:0.3rem 0.6rem;cursor:pointer;z-index:3;transition:color 0.2s,border-color 0.2s;';
		closeBtn.addEventListener('mouseover', function() { this.style.color='#00fff7'; this.style.borderColor='rgba(0,255,247,0.5)'; });
		closeBtn.addEventListener('mouseout', function() { this.style.color='rgba(0,255,247,0.3)'; this.style.borderColor='rgba(0,255,247,0.15)'; });
		closeBtn.addEventListener('click', function(e) {
			e.stopPropagation();
			document.body.removeChild(overlay);
			document.removeEventListener('keydown', escHandler);
		});
		overlay.appendChild(closeBtn);

		function escHandler(e) {
			if (e.key === 'Escape' && document.body.contains(overlay)) {
				document.body.removeChild(overlay);
				document.removeEventListener('keydown', escHandler);
			}
		}
		document.addEventListener('keydown', escHandler);

		document.body.appendChild(overlay);
	}
})();
