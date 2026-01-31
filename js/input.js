export class InputManager {
    constructor() {
        this.inputs = { throttle: 0, brake: 0, steering: 0 };
        this.config = {
            mobileMode: 'buttons', // 'buttons' o 'gyro'
            sensitivity: 1.0,
            deadzone: 0.05
        };
        
        this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        this.gyroEnabled = false;
        
        // Estado interno para botones táctiles
        this.touchState = { left: 0, right: 0, gas: 0, brake: 0 };

        this.initListeners();
    }

    initListeners() {
        // --- UI Events ---
        if (this.isMobile) {
            document.getElementById('touch-controls').classList.remove('hidden');
            this.setupTouchButtons();
        }

        // --- Config UI ---
        const modeSelect = document.getElementById('mobile-control-mode');
        modeSelect.addEventListener('change', (e) => {
            this.config.mobileMode = e.target.value;
            // Ocultar flechas si es Gyro
            const dpad = document.querySelector('.d-pad');
            dpad.style.display = (this.config.mobileMode === 'gyro') ? 'none' : 'flex';
        });

        const sensSlider = document.getElementById('sensitivity-slider');
        sensSlider.addEventListener('input', (e) => this.config.sensitivity = parseFloat(e.target.value));

        const gyroBtn = document.getElementById('calibrate-gyro');
        gyroBtn.addEventListener('click', () => this.requestGyroPermission());

        // --- Keyboard ---
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

        // --- Gyroscope ---
        this.orientation = { beta: 0, gamma: 0 };
        window.addEventListener('deviceorientation', (e) => {
            this.orientation.beta = e.beta;   // Inclinación frontal/trasera
            this.orientation.gamma = e.gamma; // Inclinación lateral (volante)
        });
    }

    setupTouchButtons() {
        const bindBtn = (id, key) => {
            const el = document.getElementById(id);
            if(!el) return;
            const set = (val) => { this.touchState[key] = val; };
            el.addEventListener('touchstart', (e) => { e.preventDefault(); set(1); });
            el.addEventListener('touchend', (e) => { e.preventDefault(); set(0); });
            el.addEventListener('mousedown', (e) => { e.preventDefault(); set(1); }); // Para pruebas en PC
            el.addEventListener('mouseup', (e) => { e.preventDefault(); set(0); });
        };

        bindBtn('btn-left', 'left');
        bindBtn('btn-right', 'right');
        bindBtn('btn-gas', 'gas');
        bindBtn('btn-brake', 'brake');
    }

    requestGyroPermission() {
        // Necesario para iOS 13+
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        this.gyroEnabled = true;
                        alert("Giroscopio Activado");
                    }
                })
                .catch(console.error);
        } else {
            this.gyroEnabled = true; // Android usualmente no pide permiso explícito clicado
        }
    }

    update() {
        // 1. GAMEPAD (Prioridad Alta)
        const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
        if (gp) {
            // Eje 0 suele ser dirección
            let steer = gp.axes[0];
            if (Math.abs(steer) < this.config.deadzone) steer = 0;
            
            // Botones/Gatillos para acelerar
            let gas = gp.buttons[7] ? gp.buttons[7].value : (gp.buttons[1].pressed ? 1 : 0);
            let brake = gp.buttons[6] ? gp.buttons[6].value : (gp.buttons[0].pressed ? 1 : 0);

            this.inputs.steering = -steer * this.config.sensitivity;
            this.inputs.throttle = gas;
            this.inputs.brake = brake;
            return this.inputs;
        }

        // 2. MÓVIL / TÁCTIL
        if (this.isMobile) {
            // Dirección
            if (this.config.mobileMode === 'gyro' && this.gyroEnabled) {
                // Usamos Gamma (inclinación lateral en modo landscape)
                // Limitamos a +/- 30 grados
                let val = this.orientation.gamma || 0;
                // Clamp y normalizar -1 a 1
                let steer = Math.max(-30, Math.min(30, val)) / 30;
                this.inputs.steering = -steer * this.config.sensitivity; 
            } else {
                // Botones
                const left = this.touchState.left;
                const right = this.touchState.right;
                // Suavizado simple
                let target = (left - right);
                this.inputs.steering += (target - this.inputs.steering) * 0.2 * this.config.sensitivity;
            }

            // Pedales (siempre botones en táctil)
            this.inputs.throttle = this.touchState.gas;
            this.inputs.brake = this.touchState.brake;
            
            return this.inputs;
        }

        // 3. TECLADO (PC Sin Gamepad)
        const forward = (this.keys['w'] || this.keys['arrowup']) ? 1 : 0;
        const back = (this.keys['s'] || this.keys['arrowdown']) ? 1 : 0;
        const left = (this.keys['a'] || this.keys['arrowleft']) ? 1 : 0;
        const right = (this.keys['d'] || this.keys['arrowright']) ? 1 : 0;

        this.inputs.throttle = forward;
        this.inputs.brake = back;
        
        let targetSteer = (left - right);
        this.inputs.steering += (targetSteer - this.inputs.steering) * 0.1 * this.config.sensitivity;

        return this.inputs;
    }
}