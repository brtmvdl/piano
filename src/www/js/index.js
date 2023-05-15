import * as THREE from 'three'

import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'

import COLORS from './colors.js'
import FONTS from './fonts.js'

const _ = {
  getWidth: () => window.innerWidth,
  getHeight: () => window.innerHeight,
  getAspect: () => _.getWidth() / _.getHeight(),
  side: THREE.DoubleSide,
}

const notes = {
  'C4': 261.63,
  'D4': 293.66,
  'E4': 329.63,
  'F4': 349.23,
  'G4': 392.00,
  'A4': 440.00,
  'B4': 493.88,
  'C5': 523.25,
}

const audioCtx = new AudioContext({ sampleRate: 9600 })

const loader = new FontLoader()

const scene = new THREE.Scene()

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

// functions

const createTextGeometry = (text = '', { size = 1, } = {}) => new Promise((res, rej) => {
  loader.load(
    FONTS.HELVETIKER,
    (font) => res(new TextGeometry(text, { font, size, height: size / 2 })),
    () => console.log(),
    (err) => rej(err),
  )
})

// classes

class KeyNote {
  ctx = null
  frequency = null

  constructor(frequency, { ctx = new AudioContext() } = {}) {
    this.frequency = frequency
    this.ctx = ctx
  }

  play(stopIn = null) {
    if (this.osc) this.stop()
    //
    this.osc = this.ctx.createOscillator()
    this.osc.type = 'square'
    this.osc.frequency.setValueAtTime(
      this.frequency,
      this.ctx.currentTime,
    )
    //
    this.osc.connect(this.ctx.destination)
    this.osc.start()

    if (stopIn) {
      setTimeout(() => this.stop(), stopIn)
    }
  }

  stop() {
    if (this.osc) {
      this.osc.stop()
    }
  }
}

// objects

createTextGeometry('Piano', { size: 1 })
  .then((geo) => {
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: COLORS.WHITE,
        side: _.side,
      })
    )

    mesh.position.set(-5.0, -1.0, +0.0)
    mesh.lookAt(camera.position)
    mesh.position.z = +1.8
    //
    scene.add(mesh)
  })

const lights = [
  { color: COLORS.WHITE, type: 'AmbientLight' },
  { color: COLORS.WHITE, type: 'DirectionalLight' },
].map(({ color, type, }) => new THREE[type](color))

lights.map((light) => scene.add(light))

const keysTextMaterial = new THREE.MeshBasicMaterial({
  color: COLORS.BLACK,
  side: _.side,
})

const keys = Object.keys(notes).map((keyText, ix) => {
  const key = new THREE.Mesh(
    new THREE.BoxGeometry(+5.0, +0.1, +1.0),
    new THREE.MeshBasicMaterial({ color: COLORS.WHITE })
  )

  key.userData['key'] = keyText
  key.userData['keynote'] = new KeyNote(notes[keyText], { ctx: audioCtx })
  key.position.z = (Object.keys(notes).length / +1.8) - (+1.2 * ix)

  createTextGeometry(keyText, { size: +0.5 })
    .then((keysTextGeo) => {
      const textMesh = new THREE.Mesh(keysTextGeo, keysTextMaterial)

      textMesh.rotation.set((-Math.PI / 2), (+0.0), (+Math.PI / 2))
      textMesh.position.set(+2.0, -0.15, +0.4)

      key.add(textMesh)
    })
    .catch((err) => console.error(err))

  return key
})

const keyGroup = new THREE.Group()
keys.map((key) => keyGroup.add(key))
scene.add(keyGroup)

const camera = new THREE.PerspectiveCamera(75, _.getAspect())
camera.position.set(+5.0, +5.0, +0.0)
camera.lookAt(+0.0, +0.0, +0.0)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(_.getWidth(), _.getHeight())
document.body.appendChild(renderer.domElement)

document.body.style.margin = '0'

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

animate()

const playNote = (keyText) => {
  const key = keys.find((k) => k.userData['key'] == keyText)
  if (!key) return

  key.material.color.set(COLORS.YELLOW)
  key.userData['keynote'].play()
}

const stopNote = (keyText) => {
  const key = keys.find((k) => k.userData['key'] == keyText)
  if (!key) return

  key.material.color.set(COLORS.WHITE)
  key.userData['keynote'].stop()
}

window.addEventListener('keydown', (ev) => {
  switch (ev.key) {
    case 'a': return playNote('C4')
    case 's': return playNote('D4')
    case 'd': return playNote('E4')
    case 'f': return playNote('F4')
    case 'g': return playNote('G4')
    case 'h': return playNote('A4')
    case 'j': return playNote('B4')
    case 'k': return playNote('C5')
  }
})

window.addEventListener('keyup', (ev) => {
  switch (ev.key) {
    case 'a': return stopNote('C4')
    case 's': return stopNote('D4')
    case 'd': return stopNote('E4')
    case 'f': return stopNote('F4')
    case 'g': return stopNote('G4')
    case 'h': return stopNote('A4')
    case 'j': return stopNote('B4')
    case 'k': return stopNote('C5')
  }
})

window.addEventListener('resize', () => {
  camera.aspect = _.getAspect()
  camera.updateProjectionMatrix()
  //
  renderer.setSize(_.getWidth(), _.getHeight())
})

renderer.domElement.addEventListener('click', (event) => {
  pointer.x = (event.clientX / _.getWidth()) * 2 - 1
  pointer.y = - (event.clientY / _.getHeight()) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const intersects = raycaster.intersectObjects(keyGroup.children)

  for (let i = 0; i < intersects.length; i++) {
    if (intersects[i].object.userData['keynote']) {
      intersects[i].object.userData['keynote'].play(100)
    }
  }
})
