export const CHALK_SKSL = `
uniform float2 u_resolution;
uniform float u_pixelRatio;
uniform float u_time;

uniform float4 u_colorBack;
uniform float4 u_colorChalk;
uniform float u_grain;
uniform float u_roughness;
uniform float u_pressure;
uniform float u_density;
uniform float u_spread;
uniform float u_glow;
uniform float u_baseline;
uniform float u_columnTop;
uniform float u_columnWidth;
uniform float u_pairGap;
uniform float u_spacing;
uniform float u_seed;
uniform float u_spanTop;
uniform float u_spanBottom;
uniform float u_rainTop;
uniform float u_mask;
uniform float u_maskFeather;
uniform float u_maskPad;

uniform float u_lights;
uniform float u_columns;
uniform float u_line;
uniform float u_flash;
uniform float u_paper;

const float DESIGN_W = 390.;
const float CELL = .05;

float hash21(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash31(float3 p) {
  p = fract(p * float3(123.34, 456.21, 789.12));
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3. - 2. * f);
  float a = hash21(i);
  float b = hash21(i + float2(1., 0.));
  float c = hash21(i + float2(0., 1.));
  float d = hash21(i + float2(1., 1.));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float sdBox(float2 q, float2 halfSize) {
  float2 d = abs(q) - halfSize;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.);
}

float chalk(float d, float halfW, float pressure, float tooth, float edge, float side) {
  float trail = step(0., side);
  float ragged = d + (edge - .5) * u_roughness * mix(.6, 1.5, trail);
  float cover = 1. - smoothstep(-.75, .75, ragged);
  float core = 1. - mix(.3, .6, trail) * smoothstep(-halfW, 0., d);
  float deposit = pressure * cover * core;
  return smoothstep(max(tooth - .2, 0.), tooth + .2, deposit);
}

float laneX(int i) {
  int pair = i / 2;
  float side = float(i - pair * 2) * 2. - 1.;
  float offset = pair == 0 ? -.27 : pair == 1 ? -.09 : pair == 2 ? .09 : .27;
  return (.5 + offset * u_spacing) * DESIGN_W + side * u_pairGap * .5;
}

half4 main(float2 fragCoord) {
  float2 fc = float2(fragCoord.x, u_resolution.y - fragCoord.y);
  float2 uv = fc / u_resolution;
  float aspect = u_resolution.y / u_resolution.x;
  float H = DESIGN_W * aspect;
  float2 P = uv * float2(DESIGN_W, H);

  float2 g = floor(fc * u_pixelRatio / max(u_pixelRatio * .6, 1.));
  float fine = hash21(g + u_seed);
  float clump = vnoise(g / 3.5 + u_seed * 7.);
  float clump2 = vnoise(g / 9. + 100.);
  float tooth = mix(.5, clamp(fine * .5 + clump * .35 + clump2 * .15, 0., 1.), u_grain);
  float edge = vnoise(g / 2.5 + 50.);

  float yBase = u_baseline * H;
  float yTop = u_columnTop * H;
  float halfW = u_columnWidth * .5;
  float ink = 0.;
  float glow = 0.;

  float lineInk = 0.;
  if (u_line > 0.) {
    float2 q = P - float2(DESIGN_W * .5, yBase);
    float d = sdBox(q, float2(DESIGN_W * .425 * u_line, 1.4));
    lineInk = chalk(d, 1.4, u_pressure * 1.4, tooth, edge, sign(q.y));
    ink = max(ink, lineInk);
    float flash = 1. + .5 * (1. - u_line) + 5. * u_flash;
    glow += exp(-max(d, 0.) / (10. + 26. * u_flash)) * .35 * u_glow * flash;
  }

  if (u_columns > 0.) {
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float top = yTop;
      float len = top - yBase;
      float hl = len * .5;
      float cy = top - hl;
      float tip = top - len * u_columns;
      float reveal = smoothstep(tip - 6., tip + 6., P.y);
      float rm = smoothstep(max(tooth - .3, 0.), tooth + .3, reveal);
      float2 q = P - float2(laneX(i), cy);
      q.x += (vnoise(float2(P.y / 42., fi * 3.1)) - .5) * 1.2;
      float d = sdBox(q, float2(halfW, hl)) - .5;
      float pr = u_pressure * (.88 + .12 * hash21(float2(fi, 3.)));
      pr *= .65 + .6 * vnoise(float2(P.y / 34., fi * 7.3 + 3.));
      pr *= .85 + .3 * vnoise(float2(P.y / 9., fi * 2.7 + 5.));
      float fadeLen = 30. + 70. * hash21(float2(fi, 11.));
      pr *= mix(.55, 1., smoothstep(top, top - fadeLen, P.y));
      ink = max(ink, chalk(d, halfW, pr, tooth, edge, sign(q.x)) * rm * u_columns);
      float baseD = length(float2(q.x, P.y - yBase));
      glow += exp(-baseD / 9.) * .22 * u_glow * u_line;
    }
  }

  if (u_lights > 0.) {
    float dashBottom = yTop + 2.;
    float dashTop = u_rainTop * H;
    float cellPx = CELL * H;
    float colHalf = .27 * u_spacing * DESIGN_W + u_pairGap * .5;
    int row0 = int(floor((P.y - dashBottom) / cellPx));
    for (int r = -1; r <= 1; r++) {
      float row = float(row0 + r);
      if (row >= 0.) {
        bool anchor = row == 0.;
        for (int i = 0; i < 8; i++) {
          float nx = (laneX(i) - DESIGN_W * .5) / colHalf;
          int pair = i / 2;
          int side = int(floor(hash21(float2(float(pair), u_seed + 5.)) * 2.));
          for (int k = 0; k < 3; k++) {
            bool root = anchor && k == 0 && (i - pair * 2) == side;
            float3 id = float3(row, float(i * 3 + k), u_seed);
            float h1 = hash31(id);
            float h2 = hash31(id + 1.7);
            float h3 = hash31(id + 3.1);
            float h4 = hash31(id + 5.3);
            float h5 = hash31(id + 7.9);
            float h6 = hash31(id + 11.3);
            float t0 = clamp((row * cellPx) / (dashTop - dashBottom), 0., 1.);
            float hl = mix(14., 5., t0) * (.5 + 1. * h3);
            float cy = root ? dashBottom + hl : dashBottom + (row + h1) * cellPx;
            float t = clamp((cy - dashBottom) / (dashTop - dashBottom), 0., 1.);
            float cluster = .35 + 1.3 * vnoise(float2(row * .45, float(i) * .6) + u_seed);
            float dens = u_density * mix(.3, 1., t) * cluster * (k == 0 ? 1. : k == 1 ? .6 : .35);
            float presence = root ? 1. : smoothstep(h2 - .08, h2 + .08, dens);
            presence *= 1. - smoothstep(dashTop - 2. * cellPx, dashTop, cy);
            float on = (1. - t) * .78 + h6 * .12;
            float lit = smoothstep(on, on + .1, u_lights);
            presence *= lit;
            if (presence > 0.) {
              float w = halfW * mix(1., .6, t) * (root ? .92 : .6 + .4 * h4);
              float halfSpan = colHalf + DESIGN_W * mix(u_spanBottom, u_spanTop, t);
              float jitter = root ? 0. : (h5 - .5) * 2. * u_spread * mix(4., 30., t);
              float x = DESIGN_W * .5 + nx * halfSpan + jitter;
              float2 q = P - float2(x, cy);
              float d = sdBox(q, float2(w, hl)) - .5;
              float pr = u_pressure * mix(.9, .7, t) * (.85 + .15 * h4) * presence;
              pr *= 1. - .45 * smoothstep(.55, 1., t);
              pr *= .8 + .4 * vnoise(float2(P.y / 18., h1 * 40.));
              ink = max(ink, chalk(d, w, pr, tooth, edge, sign(q.x)));
              float pulse = presence * exp(-(u_lights - on) * 20.);
              glow += exp(-max(d, 0.) / 5.) * .5 * u_glow * pulse;
            }
          }
        }
      }
    }
  }

  if (u_mask > 0.) {
    float colHalfM = .27 * u_spacing * DESIGN_W + u_pairGap * .5;
    float xHalf = colHalfM + DESIGN_W * u_spanTop + 24. + u_maskPad * H;
    float yLo = yBase - 6. - u_maskPad * H;
    float yHi = u_rainTop * H + u_maskPad * H;
    float fy = u_maskFeather * H;
    float fx = fy * .8;
    float2 cw = float2(DESIGN_W * .5, (yLo - fy + yHi) * .5);
    float2 hw = float2(xHalf, (yHi - yLo + fy) * .5);
    float2 dd = abs(P - cw) - hw + float2(fx, fy);
    float dist = length(max(dd, 0.)) + min(max(dd.x, dd.y), 0.);
    float soft = 1. - smoothstep(-fy * .2, fy, dist);
    float m = smoothstep(max(tooth - .35, 0.), tooth + .35, soft);
    ink *= m;
    glow *= m;
  }

  float mottle = vnoise(g / 70. + 7.) - .5;
  float fiber = vnoise(float2(g.x / 1.6, g.y / 14.) + 31.) - .5;
  float3 paper = u_colorBack.rgb * (1. + mottle * .16 + fiber * .1 + (clump2 - .5) * .05 + (fine - .5) * .03);
  paper *= 1. - .3 * length(uv - float2(.5, .55));
  paper *= 1. + .18 * smoothstep(.3, 0., uv.y);
  float3 col = mix(paper, u_colorChalk.rgb * (.9 + .1 * fine), ink);
  col += u_colorChalk.rgb * glow * .8;
  col = mix(col, float3(1.), lineInk * u_flash * .7);
  col = mix(u_colorBack.rgb, col, u_paper);
  return half4(half3(col), 1.);
}
`;
