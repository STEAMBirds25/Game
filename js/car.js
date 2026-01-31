import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Car {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.wheelMeshes = [];
        this.init();
    }

    init() {
        // Chasis
        const chassisShape = new CANNON.Box(new CANNON.Vec3(0.8, 0.4, 2));
        const chassisBody = new CANNON.Body({ mass: 150 });
        chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0.2, 0));
        chassisBody.position.set(0, 4, 0);
        chassisBody.angularDamping = 0.5;
        
        // Visual
        this.chassisMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.5, 4),
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        this.chassisMesh.castShadow = true;
        this.scene.add(this.chassisMesh);
        
        // Agregar "nariz" para que parezca F1
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 1.5), new THREE.MeshStandardMaterial({color:0xff0000}));
        nose.position.set(0,0,2.5);
        this.chassisMesh.add(nose);

        // Raycast Vehicle
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: chassisBody,
            indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2
        });

        const wheelOpts = {
            radius: 0.35, directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30, suspensionRestLength: 0.3,
            frictionSlip: 1.4, dampingRelaxation: 2.3, dampingCompression: 4.4,
            maxSuspensionForce: 100000, rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
            maxSuspensionTravel: 0.3, useCustomSlidingRotationalSpeed: true,
            customSlidingRotationalSpeed: -30
        };

        // Ruedas
        const yOff = 0;
        const xOff = 0.9;
        const zOff = 1.3;
        
        wheelOpts.chassisConnectionPointLocal.set(xOff, yOff, zOff);
        this.vehicle.addWheel(wheelOpts);
        wheelOpts.chassisConnectionPointLocal.set(-xOff, yOff, zOff);
        this.vehicle.addWheel(wheelOpts);
        wheelOpts.chassisConnectionPointLocal.set(xOff, yOff, -zOff);
        this.vehicle.addWheel(wheelOpts);
        wheelOpts.chassisConnectionPointLocal.set(-xOff, yOff, -zOff);
        this.vehicle.addWheel(wheelOpts);

        this.vehicle.addToWorld(this.world);

        // Ruedas Visuales
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.5, 20);
        wheelGeo.rotateZ(Math.PI/2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        for(let i=0; i<this.vehicle.wheelInfos.length; i++){
            const m = new THREE.Mesh(wheelGeo, wheelMat);
            this.scene.add(m);
            this.wheelMeshes.push(m);
        }
    }

    update(input) {
        const engineForce = 1500;
        const maxSteer = 0.5;
        
        this.vehicle.applyEngineForce(-input.throttle * engineForce, 2);
        this.vehicle.applyEngineForce(-input.throttle * engineForce, 3);
        
        this.vehicle.setBrake(input.brake * 100, 0);
        this.vehicle.setBrake(input.brake * 100, 1);
        this.vehicle.setBrake(input.brake * 100, 2);
        this.vehicle.setBrake(input.brake * 100, 3);

        this.vehicle.setSteeringValue(input.steering * maxSteer, 0);
        this.vehicle.setSteeringValue(input.steering * maxSteer, 1);

        // Sync visual
        this.chassisMesh.position.copy(this.vehicle.chassisBody.position);
        this.chassisMesh.quaternion.copy(this.vehicle.chassisBody.quaternion);
        
        for(let i=0; i<4; i++){
            this.vehicle.updateWheelTransform(i);
            const t = this.vehicle.wheelInfos[i].worldTransform;
            this.wheelMeshes[i].position.copy(t.position);
            this.wheelMeshes[i].quaternion.copy(t.quaternion);
        }
    }
}