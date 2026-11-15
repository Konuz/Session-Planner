// Szklane style kopuł odległości Wszechświata lokalnego (wybór w liście „Warstwy”); styl „plain” to domeMaterial().
// Każdy styl to ShaderMaterial z mundurami
// `color` i `opacity` (wygaszanie warstw pisze uniforms.opacity.value), mieszanie addytywne (cztery współśrodkowe
// kopuły nie zależą od kolejności rysowania), bez czasu w shaderze (scena renderuje się na żądanie). Odbicia liczą się
// w układzie świata (cameraPosition, normalna z modelMatrix), a „okno” odbijanego światła stoi względem kamery
// (wbudowana viewMatrix), z boku kadru: odblask ląduje blisko lewego konturu kopuły, a nie na Drodze Mlecznej i Grupie
// Lokalnej w środku, i nie potrzeba mundurów aktualizowanych w każdej klatce. Z wnętrza kopuły okno prawie gaśnie
// i przy samej powierzchni (inaczej wisiałoby w tym samym miejscu ekranu jak smuga na obiektywie).
import * as THREE from 'three'
import type { DomeStyle } from '../../lib/space3d'
import { domeMaterial } from './galaxyModels'

const vertexShader = `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vCenter;
  varying float vRadius;
  varying float vHeight;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vRadius = length(position);
    // Wysokość nad płaszczyzną Galaktyki jako sinus wzniesienia (0 u podstawy, 1 w zenicie kopuły).
    vHeight = position.y / vRadius;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`

/** Wspólny początek: normalna zwrócona ku kamerze (obie strony kopuły), Schlick i odbicie prostokątnego „okna”. */
const common = `
  uniform vec3 color;
  uniform float opacity;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vCenter;
  varying float vRadius;
  varying float vHeight;
  vec3 viewDir() { return normalize(cameraPosition - vWorldPos); }
  vec3 facingNormal() {
    vec3 n = normalize(vWorldNormal);
    return gl_FrontFacing ? n : -n;
  }
  float schlick(float ndv, float f0, float k) { return f0 + (1.0 - f0) * pow(max(1e-6, 1.0 - ndv), k); }
  // Okno odbija się w pełni dopiero z dala od kopuły: wewnątrz 0,15,
  // tuż przy powierzchni rośnie do 1 przy odległości kamery 1,5 promienia; z bliska odblask zająłby pół kadru.
  float outsideDome() { return mix(0.15, 1.0, smoothstep(1.0, 1.5, length(cameraPosition - vCenter) / vRadius)); }
  // Źródło światła (softbox) przyczepione do kamery: odbity promień w układzie kamery trafia w zaokrąglony prostokąt
  // (superelipsa) o miękkich brzegach, jaśniejszy u góry. size = połowa szerokości i wysokości (tangensy kątów),
  // dir = kierunek środka okna w układzie kamery.
  float softbox(vec3 rWorld, vec2 size, vec3 dir) {
    vec3 r = (viewMatrix * vec4(rWorld, 0.0)).xyz;
    vec3 c = normalize(dir);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), c));
    vec3 up = cross(c, right);
    float z = dot(r, c);
    if (z <= 0.0) return 0.0;
    vec2 q = vec2(dot(r, right), dot(r, up)) / z / size;
    float shape = pow(max(1e-8, pow(abs(q.x), 4.0) + pow(abs(q.y), 4.0)), 0.25);
    return smoothstep(1.0, 0.75, shape) * (0.65 + 0.35 * clamp(q.y, -1.0, 1.0));
  }
  // Przy przezroczystym płótnie (alpha: true) i AdditiveBlending alfa = 1.0 zapisywała w buforze pełne krycie,
  // przez co kopuła wycinała czarne łaty w tle CSS sceny; premultipliedAlpha + alfa z jasności zachowują tło.
  vec4 domeColor(vec3 c) {
    vec3 rgb = max(vec3(0.0), c) * opacity;
    return vec4(rgb, clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0));
  }`

function material(fragmentShader: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x00e0ff) },
      opacity: { value: 1 },
    },
    vertexShader,
    fragmentShader: common + fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
  })
}

/** Bańka z odblaskiem: obwódka Fresnela i odbicie prostokątnego okna na przedniej i (słabiej) tylnej ściance. */
function bubbleGlint() {
  return material(`
    void main() {
      vec3 n = facingNormal();
      vec3 v = viewDir();
      float ndv = clamp(dot(n, v), 0.0, 1.0);
      float rim = pow(max(1e-6, 1.0 - ndv), 3.0);
      vec3 r = reflect(-v, n);
      // Tylna ścianka odbija słabiej: światło przeszło już przez przednią.
      float wall = gl_FrontFacing ? 1.0 : 0.4;
      float key = softbox(r, vec2(0.07, 0.1), vec3(-0.75, 0.6, 0.28)) * schlick(ndv, 0.5, 5.0);
      float fill = softbox(r, vec2(0.12, 0.025), vec3(0.8, -0.35, 0.45)) * schlick(ndv, 0.3, 5.0);
      vec3 c = color * (0.002 + rim * 0.05) + vec3(1.0, 0.98, 0.95) * (key * 1.5 + fill * 0.4) * wall * outsideDome();
      gl_FragColor = domeColor(c);
    }`)
}

/** Odbicie Drogi Mlecznej: odbity promień próbkuje analityczne otoczenie z jasnym pasem płaszczyzny Galaktyki. */
function milkyWayReflection() {
  return material(`
    vec3 environment(vec3 r) {
      float az = length(r.xz) > 1e-5 ? atan(r.z, r.x) : 0.0;
      // Pas wzdłuż płaszczyzny (r.y ≈ 0) z nierówną jasnością i zgrubieniem w stronę centrum (+x od Słońca).
      float band = exp(-pow(r.y / 0.07, 2.0)) * (0.7 + 0.3 * sin(az * 3.0) * sin(az * 7.0 + 1.3));
      float bulge = exp(-az * az / 0.35) * exp(-pow(r.y / 0.16, 2.0));
      float sky = smoothstep(0.05, 1.0, r.y);
      return vec3(1.0, 0.9, 0.76) * (band + bulge * 1.4) + color * sky * 0.2;
    }
    void main() {
      vec3 n = facingNormal();
      vec3 v = viewDir();
      float ndv = clamp(dot(n, v), 0.0, 1.0);
      vec3 r = reflect(-v, n);
      float f = schlick(ndv, 0.04, 5.0);
      float wall = gl_FrontFacing ? 1.0 : 0.3 * smoothstep(0.0, 0.15, vHeight);
      vec3 c = environment(r) * f * 0.55 * wall + color * (0.0015 + pow(max(1e-6, 1.0 - ndv), 3.0) * 0.02);
      gl_FragColor = domeColor(c);
    }`)
}

/** Grube szkło: rozszczepienie barw na obwódce, druga linia wewnętrznej ścianki i krawędź szkła u podstawy. */
function thickGlass() {
  return material(`
    void main() {
      vec3 n = facingNormal();
      vec3 v = viewDir();
      float ndv = clamp(dot(n, v), 0.0, 1.0);
      float g = max(1e-6, 1.0 - ndv);
      // Rozszczepienie: każda barwa ma inny wykładnik, więc obwódka ma barwną frędzlę.
      vec3 rim = vec3(pow(g, 3.6), pow(g, 3.0), pow(g, 2.4)) * vec3(0.55, 0.95, 1.0);
      // Wewnętrzna ścianka grubej powłoki: cienka linia równoległa do konturu, trochę w głąb.
      float inner = exp(-pow((ndv - 0.24) / 0.025, 2.0));
      // Krawędź szkła u podstawy (szlif na styku z pierścieniem).
      float lip = exp(-pow(vHeight / 0.006, 2.0)) * 0.16;
      vec3 r = reflect(-v, n);
      float window = softbox(r, vec2(0.022, 0.2), vec3(-0.8, 0.45, 0.35)) * schlick(ndv, 0.35, 5.0);
      float wall = gl_FrontFacing ? 1.0 : 0.35;
      window *= outsideDome();
      vec3 edge = vec3(0.55, 1.0, 0.92);
      vec3 c = (rim * 0.07 + edge * inner * 0.03 + vec3(0.9, 1.0, 1.0) * window * 0.8) * wall + color * lip;
      gl_FragColor = domeColor(c);
    }`)
}

/** Materiał kopuły w danym stylu; wygaszanie warstw pisze uniforms.opacity.value każdego z nich. */
export function createDomeMaterial(style: DomeStyle): THREE.ShaderMaterial {
  switch (style) {
    case 'glint': return bubbleGlint()
    case 'reflection': return milkyWayReflection()
    case 'thick': return thickGlass()
    default: return domeMaterial()
  }
}
