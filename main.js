class JuegoMemoria {
    // --- CONSTANTES GLOBALES ---
    static #TIEMPO_VISTA_CARTA = 1000;
    static #TIEMPO_TRANSICION = 1500;
    // Sustituidos los emojis por las rutas a tus imágenes PNG
    // Ahora apuntan a tu carpeta 'img'
    static #ICONOS = ['img/1.png', 'img/2.png', 'img/3.png', 'img/4.png', 'img/15.png', 'img/6.png', 'img/7.png', 'img/8.png'];

    // --- ESTADO PRIVADO ---
    #maxJugadores = 0;
    #jugadorActual = 1;
    #resultados = [];
    #tableroVirtual = [];
    
    #cartasLevantadas = [];
    #parejasEncontradas = 0;
    #bloqueado = false;
    
    #tiempoInicio = 0;
    #rafId = null;
    #idleTimeout = null; // Controla el tiempo sin tocar la pantalla

    #ui = {};
    #audio = {};

    constructor() {
        this.#inicializarDOM();
        this.#inicializarAudio();
        this.#vincularEventos();

        // Al iniciar, mostramos el screensaver en lugar del menú normal
        this.#ui.screensaver.showModal();
        this.#iniciarControlInactividad();
    }

    // --- 1. CONFIGURACIÓN INICIAL ---

    #inicializarDOM() {
        const $ = (selector) => document.querySelector(selector);
        
        this.#ui = {
            screensaver: $('#screensaver'), // Registramos el nuevo modal
            modalSeleccion: $('#modal-seleccion'),
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
            btnVolver: $('#btn-volver') 
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
            
            // 120000 ms = 2 minutos. (Pon 5000 para hacer pruebas rápidas)
            this.#idleTimeout = setTimeout(() => {
                location.reload(); 
            }, 120000); 
        };

        // Escuchamos cualquier toque en la pantalla
        ['click', 'touchstart', 'keydown'].forEach(evento => {
            document.addEventListener(evento, resetearTemporizador);
        });

        resetearTemporizador();
    }

    #vincularEventos() {
        this.#ui.btnVolver.addEventListener('click', () => this.#volverAlInicio());

        // Quitar screensaver al tocar la pantalla y CAMBIAR EL FONDO
        this.#ui.screensaver.addEventListener('click', () => {
            this.#ui.screensaver.close();
            
            // Aquí está la magia: le añadimos una clase al body
            document.body.classList.add('modo-juego'); 
            
            this.#ui.modalSeleccion.showModal();
        });

        this.#ui.btnsNum.forEach(btn => 
            btn.addEventListener('click', (e) => this.#seleccionarJugadores(e))
        );

        this.#ui.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.#iniciarPartida();
        });

        this.#ui.tablero.addEventListener('click', (e) => this.#procesarClic(e));
        this.#ui.btnReiniciar.addEventListener('click', () => location.reload());

        // Botón opcional para cortar antes de tiempo
        if (this.#ui.btnTerminar) {
            this.#ui.btnTerminar.addEventListener('click', () => {
                this.#ui.modalJugador.close();
                this.#mostrarResultadosFinales();
            });
        }

        // Control de Periféricos (Kiosco y Portátil)
        document.addEventListener('click', (e) => this.#manejarTecladoVirtual(e));
        document.addEventListener('keydown', (e) => this.#manejarTecladoFisico(e));
    }

    // --- 2. GESTORES DE PERIFÉRICOS E INTERFAZ ---
    #volverAlInicio() {
        // 1. Detenemos cualquier cronómetro en curso
        cancelAnimationFrame(this.#rafId);
        
        // ¡MAGIA!: Volvemos a esconder el botón al volver al menú
        this.#ui.btnVolver.style.display = 'none';
        this.#ui.panelControl.style.display = 'none';
        
        // 2. Reseteamos toda la memoria de la partida actual
        this.#maxJugadores = 0;
        this.#jugadorActual = 1;
        this.#resultados = [];
        this.#cartasLevantadas = [];
        this.#parejasEncontradas = 0;
        this.#bloqueado = false;
        
        // 3. Limpiamos la pantalla (textos y tablero)
        this.#ui.tablero.innerHTML = '';
        this.#ui.displayTiempo.textContent = '0.0s';
        this.#ui.displayNombre.textContent = '---';
        
        // 4. Cerramos posibles modales abiertos por si acaso
        this.#ui.modalJugador.close();
        this.#ui.modalResultados.close();
        
        // 5. Volvemos a abrir el menú inicial
        this.#ui.modalSeleccion.showModal();
    }

    #seleccionarJugadores(e) {
        const val = parseInt(e.target.dataset.num, 10);
        // Cambiado val < 2 a val < 1
        if (Number.isNaN(val) || val < 1 || val > 5) return; 
        
        this.#maxJugadores = val;
        this.#ui.modalSeleccion.close();
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

    // --- 3. MOTOR DEL JUEGO: LÓGICA ---

    #iniciarPartida() {
        const nombre = this.#ui.inputNombre.value.trim();
        if (!nombre) return;

        this.#ui.displayNombre.textContent = nombre;
        this.#ui.modalJugador.close();
        
        // ¡MAGIA!: Mostramos el botón solo cuando empieza el juego
        this.#ui.btnVolver.style.display = 'block';
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
            
            // Creamos la etiqueta <img> para los PNG
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

    // --- 4. CÁLCULOS FINALES ---

    #actualizarCronometro() {
        const segundos = ((performance.now() - this.#tiempoInicio) / 1000).toFixed(1);
        this.#ui.displayTiempo.textContent = `${segundos}s`;
        this.#rafId = requestAnimationFrame(() => this.#actualizarCronometro());
    }

    #finalizarTurno() {
        cancelAnimationFrame(this.#rafId);
        
        const tiempoFinal = ((performance.now() - this.#tiempoInicio) / 1000).toFixed(1);
        this.#resultados.push({
            nombre: this.#ui.displayNombre.textContent,
            tiempo: parseFloat(tiempoFinal)
        });

        if (this.#jugadorActual < this.#maxJugadores) {
            this.#jugadorActual++;
            setTimeout(() => this.#actualizarUIJugador(), JuegoMemoria.#TIEMPO_TRANSICION); 
        } else {
            setTimeout(() => this.#mostrarResultadosFinales(), JuegoMemoria.#TIEMPO_TRANSICION);
        }
    }

    #mostrarResultadosFinales() {
        // 1. Ordenamos resultados (menor tiempo primero)
        this.#resultados.sort((a, b) => a.tiempo - b.tiempo);

        // 2. Tomamos los 3 mejores (o los que haya si son menos)
        const top3 = this.#resultados.slice(0, 3);
        
        // 3. Reordenamos para el podio visual: [2º, 1º, 3º]
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
    }
}

const juego = new JuegoMemoria();