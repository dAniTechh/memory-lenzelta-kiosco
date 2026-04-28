class JuegoMemoria {
    static #TIEMPO_VISTA_CARTA = 1000;
    static #TIEMPO_TRANSICION = 1500;
    static #ICONOS = ['img/1.png', 'img/2.png', 'img/3.png', 'img/4.png', 'img/15.png', 'img/6.png', 'img/7.png', 'img/8.png'];

    #maxJugadores = 0;
    #jugadorActual = 1;
    #resultados = [];
    #tableroVirtual = [];
    #cartasLevantadas = [];
    #parejasEncontradas = 0;
    #bloqueado = false;
    #tiempoInicio = 0;
    #rafId = null;
    #idleTimeout = null; 
    #intervaloAtraccion = null;

    #ui = {};
    #audio = {};

    constructor() {
        this.#inicializarDOM();
        this.#inicializarAudio();
        this.#vincularEventos();

        this.#asegurarRecordDani(); // 🚀 INYECTA LA MARCA DEL CREADOR
        
        this.#actualizarTop10Inicio();
        this.#ui.screensaver.showModal();
        this.#iniciarModoAtraccion(); 
        this.#iniciarControlInactividad();
    }

    #inicializarDOM() {
        const $ = (selector) => document.querySelector(selector);
        
        this.#ui = {
            screensaver: $('#screensaver'), 
            screensaverCartas: $('#screensaver-cartas'),
            modalSeleccion: $('#modal-seleccion'),
            panelRecordsIzq: $('#panel-records-izq'), 
            listaRecordsInicio: $('#lista-records-inicio'), 
            btnsNum: document.querySelectorAll('.btn-num'),
            modalJugador: $('#modal-jugador'),
            form: $('#form-jugador'),
            inputNombre: $('#nombre-jugador'),
            contadorJugadores: $('#contador-jugadores'),
            totalJugadoresDisplay: $('#total-jugadores-display'),
            displayNombre: $('#display-nombre'),
            displayTiempo: $('#display-tiempo'),
            panelControl: $('.panel-control'),
            tablero: $('#tablero'),
            modalResultados: $('#modal-resultados'),
            listaResultados: $('#lista-resultados'),
            btnReiniciar: $('#btn-reiniciar'),
            btnTerminar: $('#btn-terminar'),
            btnsVolver: document.querySelectorAll('.btn-accion-volver')
        };
    }

    #inicializarAudio() {
        this.#audio = {
            acierto: new Audio('vaca.mp3'),
            error: new Audio('error.mp3')
        };
        this.#audio.acierto.preload = 'auto';
        this.#audio.error.preload = 'auto';
    }

    #iniciarControlInactividad() {
        const resetearTemporizador = () => {
            clearTimeout(this.#idleTimeout);
            this.#idleTimeout = setTimeout(() => { location.reload(); }, 120000); 
        };
        ['click', 'touchstart', 'keydown'].forEach(evento => document.addEventListener(evento, resetearTemporizador));
        resetearTemporizador();
    }

    // --- MARCA FIJA DEL CREADOR ---
    #asegurarRecordDani() {
        let historico = JSON.parse(localStorage.getItem('lenzelta_records')) || [];
        
        // Comprueba si ya está Dani metido para no duplicarlo en cada recarga
        const existeDani = historico.some(r => r.nombre === "Dani" && r.tiempo === 18.9);
        
        if (!existeDani) {
            historico.push({ nombre: "Dani", tiempo: 16.9 });
            historico.sort((a, b) => a.tiempo - b.tiempo);
            historico = historico.slice(0, 10);
            localStorage.setItem('lenzelta_records', JSON.stringify(historico));
        }
    }

    #iniciarModoAtraccion() {
        this.#ui.screensaverCartas.innerHTML = '';
        const crearCarta = () => {
            if (!this.#ui.screensaver.open) return; 
            const carta = document.createElement('div');
            carta.className = 'carta-flotante';
            const imgRandom = JuegoMemoria.#ICONOS[Math.floor(Math.random() * JuegoMemoria.#ICONOS.length)];
            carta.style.backgroundImage = Math.random() > 0.35 ? `url('${imgRandom}')` : `url('img/5.png')`;
            carta.style.left = `${Math.random() * 95}%`;
            const duracion = 12 + Math.random() * 18; 
            carta.style.animationDuration = `${duracion}s`;
            const size = 70 + Math.random() * 110; 
            carta.style.width = `${size}px`;
            carta.style.height = `${size}px`;
            this.#ui.screensaverCartas.appendChild(carta);
            setTimeout(() => { if (carta.parentNode) carta.parentNode.removeChild(carta); }, duracion * 1000);
        };
        for (let i = 0; i < 5; i++) setTimeout(crearCarta, i * 1500);
        this.#intervaloAtraccion = setInterval(crearCarta, 3000);
    }

    #detenerModoAtraccion() {
        clearInterval(this.#intervaloAtraccion);
        this.#ui.screensaverCartas.innerHTML = ''; 
    }

    #vincularEventos() {
        this.#ui.btnsVolver.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#volverAlInicio();
            });
        });

        this.#ui.screensaver.addEventListener('click', () => {
            this.#ui.screensaver.close();
            this.#detenerModoAtraccion(); 
            document.body.classList.add('modo-juego'); 
            
            this.#ui.panelRecordsIzq.style.display = 'flex';
            this.#ui.modalSeleccion.showModal();
        });

        this.#ui.btnsNum.forEach(btn => btn.addEventListener('click', (e) => this.#seleccionarJugadores(e)));

        this.#ui.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.#iniciarPartida();
        });

        this.#ui.tablero.addEventListener('click', (e) => this.#procesarClic(e));
        this.#ui.btnReiniciar.addEventListener('click', () => location.reload());

        if (this.#ui.btnTerminar) {
            this.#ui.btnTerminar.addEventListener('click', () => {
                this.#ui.modalJugador.close();
                this.#mostrarResultadosFinales();
            });
        }

        document.addEventListener('click', (e) => this.#manejarTecladoVirtual(e));
        document.addEventListener('keydown', (e) => this.#manejarTecladoFisico(e));
    }

    #guardarRecordLocal(nombre, tiempo) {
        let historico = JSON.parse(localStorage.getItem('lenzelta_records')) || [];
        historico.push({ nombre, tiempo });
        historico.sort((a, b) => a.tiempo - b.tiempo);
        historico = historico.slice(0, 10);
        localStorage.setItem('lenzelta_records', JSON.stringify(historico));
        this.#actualizarTop10Inicio(); 
    }

    #actualizarTop10Inicio() {
        let historico = JSON.parse(localStorage.getItem('lenzelta_records')) || [];
        if (historico.length === 0) {
            this.#ui.listaRecordsInicio.innerHTML = '<div style="opacity: 0.5; padding: 10px; text-align: center;">AÚN NO HAY RÉCORDS.<br>¡SÉ EL PRIMERO!</div>';
        } else {
            this.#ui.listaRecordsInicio.innerHTML = historico.map((r, i) => {
                let medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
                return `
                    <div class="fila-record-lateral">
                        <span>${medalla} ${r.nombre}</span>
                        <span style="color: var(--neon-blue); font-weight: 900; text-shadow: 0 0 5px var(--neon-blue);">${r.tiempo}s</span>
                    </div>
                `;
            }).join('');
        }
    }

    #volverAlInicio() {
        cancelAnimationFrame(this.#rafId);
        
        this.#ui.btnsVolver.forEach(btn => btn.style.display = 'none');
        this.#ui.panelControl.style.display = 'none';
        
        this.#maxJugadores = 0;
        this.#jugadorActual = 1;
        this.#resultados = [];
        this.#cartasLevantadas = [];
        this.#parejasEncontradas = 0;
        this.#bloqueado = false;
        
        this.#ui.tablero.innerHTML = '';
        this.#ui.displayTiempo.textContent = '0.0s';
        this.#ui.displayNombre.textContent = '---';
        
        this.#ui.modalJugador.close();
        this.#ui.modalResultados.close();
        
        this.#actualizarTop10Inicio(); 
        
        this.#ui.panelRecordsIzq.style.display = 'flex';
        this.#ui.modalSeleccion.showModal();
    }

    #seleccionarJugadores(e) {
        const val = parseInt(e.currentTarget.dataset.num, 10);
        if (Number.isNaN(val) || val < 1 || val > 5) return; 
        
        this.#maxJugadores = val;
        this.#ui.modalSeleccion.close();
        
        this.#ui.panelRecordsIzq.style.display = 'none';
        this.#ui.btnsVolver.forEach(btn => btn.style.display = 'block');
        
        this.#actualizarUIJugador();
    }

    #manejarTecladoVirtual(e) {
        if (!e.target.matches('.tecla')) return;
        if (e.target.dataset.accion === 'borrar') {
            this.#ui.inputNombre.value = this.#ui.inputNombre.value.slice(0, -1);
        } else {
            this.#ui.inputNombre.value += e.target.textContent;
        }
    }

    #manejarTecladoFisico(e) {
        if (this.#ui.modalSeleccion.open) {
            if (['1', '2', '3', '4', '5'].includes(e.key)) {
                this.#maxJugadores = parseInt(e.key, 10);
                this.#ui.modalSeleccion.close();
                
                this.#ui.panelRecordsIzq.style.display = 'none';
                this.#ui.btnsVolver.forEach(btn => btn.style.display = 'block');
                this.#actualizarUIJugador();
            }
            return;
        }

        if (this.#ui.modalJugador.open) {
            const tecla = e.key.toUpperCase();
            if (/^[A-ZÑ]$/.test(tecla)) {
                this.#ui.inputNombre.value += tecla;
            } else if (e.key === 'Backspace') {
                this.#ui.inputNombre.value = this.#ui.inputNombre.value.slice(0, -1);
            } else if (e.key === 'Enter' && this.#ui.inputNombre.value.trim() !== '') {
                e.preventDefault();
                this.#iniciarPartida();
            }
        }
    }

    #actualizarUIJugador() {
        this.#ui.contadorJugadores.textContent = this.#jugadorActual;
        this.#ui.totalJugadoresDisplay.textContent = this.#maxJugadores;
        this.#ui.inputNombre.value = ''; 
        if (this.#ui.btnTerminar) {
            this.#ui.btnTerminar.style.display = this.#jugadorActual > 1 ? 'block' : 'none';
        }
        this.#ui.modalJugador.showModal(); 
    }

    #iniciarPartida() {
        const nombre = this.#ui.inputNombre.value.trim();
        if (!nombre) return;
        this.#ui.displayNombre.textContent = nombre;
        this.#ui.modalJugador.close();
        
        this.#ui.btnsVolver.forEach(btn => btn.style.display = 'block');
        this.#ui.panelControl.style.display = 'flex';
        
        this.#parejasEncontradas = 0;
        this.#cartasLevantadas = [];
        this.#bloqueado = false;
        this.#generarBaraja();
        
        cancelAnimationFrame(this.#rafId); 
        this.#tiempoInicio = performance.now();
        this.#actualizarCronometro();
    }

    #generarBaraja() {
        const mazo = [...JuegoMemoria.#ICONOS, ...JuegoMemoria.#ICONOS];
        for (let i = mazo.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mazo[i], mazo[j]] = [mazo[j], mazo[i]]; 
        }
        this.#tableroVirtual = mazo;
        this.#renderizarTablero();
    }

    #renderizarTablero() {
        this.#ui.tablero.innerHTML = '';
        const fragmento = document.createDocumentFragment();
        const template = document.querySelector('#template-carta').content;

        this.#tableroVirtual.forEach((rutaImagen, indice) => {
            const clon = template.cloneNode(true);
            const carta = clon.querySelector('.carta');
            carta.dataset.indice = indice;
            carta.dataset.valor = rutaImagen;
            const img = document.createElement('img');
            img.src = rutaImagen;
            img.className = 'imagen-carta';
            clon.querySelector('.carta-frente').appendChild(img);
            fragmento.appendChild(clon);
        });
        this.#ui.tablero.appendChild(fragmento);
    }

    #procesarClic(e) {
        const cartaDOM = e.target.closest('.carta');
        if (!cartaDOM || this.#bloqueado || cartaDOM.classList.contains('volteada')) return;
        cartaDOM.classList.add('volteada');
        this.#cartasLevantadas.push(cartaDOM);

        if (this.#cartasLevantadas.length === 2) {
            this.#bloqueado = true;
            this.#verificarPareja();
        }
    }

    #verificarPareja() {
        const [carta1, carta2] = this.#cartasLevantadas;
        if (carta1.dataset.valor === carta2.dataset.valor) {
            this.#reproducirSonido(this.#audio.acierto);
            this.#parejasEncontradas++;
            this.#cartasLevantadas = [];
            this.#bloqueado = false;

            if (this.#parejasEncontradas === JuegoMemoria.#ICONOS.length) {
                this.#finalizarTurno();
            }
        } else {
            this.#reproducirSonido(this.#audio.error);
            setTimeout(() => {
                carta1.classList.remove('volteada');
                carta2.classList.remove('volteada');
                this.#cartasLevantadas = [];
                this.#bloqueado = false;
            }, JuegoMemoria.#TIEMPO_VISTA_CARTA);
        }
    }

    #reproducirSonido(audioElement) {
        audioElement.currentTime = 0; 
        audioElement.play().catch(console.warn);
    }

    #actualizarCronometro() {
        const segundos = ((performance.now() - this.#tiempoInicio) / 1000).toFixed(1);
        this.#ui.displayTiempo.textContent = `${segundos}s`;
        this.#rafId = requestAnimationFrame(() => this.#actualizarCronometro());
    }

    #finalizarTurno() {
        cancelAnimationFrame(this.#rafId);
        const tiempoFinal = parseFloat(((performance.now() - this.#tiempoInicio) / 1000).toFixed(1));
        const nombre = this.#ui.displayNombre.textContent;
        
        this.#resultados.push({ nombre: nombre, tiempo: tiempoFinal });
        this.#guardarRecordLocal(nombre, tiempoFinal);

        if (this.#jugadorActual < this.#maxJugadores) {
            this.#jugadorActual++;
            setTimeout(() => this.#actualizarUIJugador(), JuegoMemoria.#TIEMPO_TRANSICION); 
        } else {
            setTimeout(() => this.#mostrarResultadosFinales(), JuegoMemoria.#TIEMPO_TRANSICION);
        }
    }

    #mostrarResultadosFinales() {
        this.#resultados.sort((a, b) => a.tiempo - b.tiempo);
        const top3 = this.#resultados.slice(0, 3);
        const ordenPodio = [];
        if (top3[1]) ordenPodio.push({ ...top3[1], pos: 2, clase: 'plata' });
        if (top3[0]) ordenPodio.push({ ...top3[0], pos: 1, clase: 'oro' });
        if (top3[2]) ordenPodio.push({ ...top3[2], pos: 3, clase: 'bronce' });

        this.#ui.listaResultados.innerHTML = `
            <div class="podio-kahoot">
                ${ordenPodio.map(r => `
                    <div class="columna-podio ${r.clase}">
                        <div class="nombre-podio">${r.nombre}</div>
                        <div class="barra-podio">
                            <span class="puesto-numero">${r.pos}º</span>
                            <div class="tiempo-podio">${r.tiempo}s</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="resto-clasificacion">
                ${this.#resultados.slice(3).map((r, i) => `
                    <div class="fila-otros">
                        <span>${i + 4}º ${r.nombre}</span>
                        <span>${r.tiempo}s</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.#ui.modalResultados.showModal();
        this.#ui.btnsVolver.forEach(btn => btn.style.display = 'block'); 
    }
}

const juego = new JuegoMemoria();