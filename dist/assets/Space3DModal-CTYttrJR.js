import{$ as e,A as t,C as n,D as r,Dt as i,E as a,F as o,G as s,I as c,J as l,L as u,N as d,O as f,Q as p,S as m,T as h,Tt as g,W as _,X as v,Y as y,Z as b,a as x,b as S,et as C,it as w,j as T,k as E,l as D,nt as O,q as k,rt as ee,t as A,tt as j,w as M,wt as N,x as te}from"./data-By8ekeuY.js";import{i as P,n as F,r as ne,t as re}from"./CloseButton-D4Lkh4WA.js";import{a as ie,i as I,s as ae,v as L}from"./format-GHmRIB0G.js";import{u as oe}from"./astro-DQ9tff8l.js";import{$ as R,$n as se,A as z,An as ce,B,Bn as V,C as le,Cn as H,Ct as ue,D as de,Dn as fe,E as pe,Et as me,F as he,Fn as ge,G as U,Gn as _e,H as ve,Hn as ye,I as be,In as xe,J as W,Jn as Se,K as Ce,Kn as G,L as K,Ln as we,M as Te,Mn as Ee,Mt as De,N as Oe,Nn as ke,Nt as Ae,O as je,On as Me,Ot as Ne,P as Pe,Pn as Fe,Q as Ie,Qn as Le,R as Re,Rn as ze,S as q,Sn as Be,St as Ve,T as He,Tn as Ue,Tt as We,U as Ge,Un as Ke,W as qe,Wn as Je,X as Ye,Xn as Xe,Y as Ze,Yn as Qe,Z as $e,Zn as et,_ as tt,_n as nt,_t as rt,a as it,ar as at,at as ot,b as st,bt as ct,c as lt,cr as ut,ct as dt,dn as ft,dt as pt,er as mt,et as ht,f as gt,fn as _t,fr as vt,ft as yt,g as bt,gn as xt,gt as St,h as Ct,hn as wt,ht as Tt,ir as Et,it as Dt,j as Ot,jn as kt,k as At,kn as jt,l as Mt,ln as Nt,lr as Pt,lt as J,m as Ft,mn as It,mr as Lt,mt as Rt,nr as zt,nt as Bt,o as Vt,or as Ht,ot as Ut,p as Wt,pr as Gt,pt as Kt,qn as Y,rr as qt,rt as Jt,s as Yt,sr as Xt,st as Zt,tr as Qt,tt as $t,u as en,un as tn,ut as nn,vt as rn,w as an,wn as on,wt as sn,x as cn,xt as ln,y as un,yt as dn,z as fn}from"./index-B5mS05Ws.js";import{n as pn,t as mn}from"./ConstellationPicker-Bhq0_42D.js";var hn={name:`chevron-right`,size:24,node:[[`path`,{d:`m9 18 6-6-6-6`,key:`mthhwq`}]]};hn.node;var gn=L(hn),_n={name:`skip-back`,size:24,node:[[`path`,{d:`M17.971 4.285A2 2 0 0 1 21 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z`,key:`15892j`}],[`path`,{d:`M3 20V4`,key:`1ptbpl`}]]};_n.node;var vn=L(_n),yn={name:`skip-forward`,size:24,node:[[`path`,{d:`M21 4v16`,key:`7j8fe9`}],[`path`,{d:`M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z`,key:`zs4d6`}]]};yn.node;var bn=L(yn),xn={name:`zoom-in`,size:24,node:[[`circle`,{cx:`11`,cy:`11`,r:`8`,key:`4ej97u`}],[`line`,{x1:`21`,x2:`16.65`,y1:`21`,y2:`16.65`,key:`13gj7c`}],[`line`,{x1:`11`,x2:`11`,y1:`8`,y2:`14`,key:`1vmskp`}],[`line`,{x1:`8`,x2:`14`,y1:`11`,y2:`11`,key:`durymu`}]]};xn.node;var Sn=L(xn),Cn={name:`zoom-out`,size:24,node:[[`circle`,{cx:`11`,cy:`11`,r:`8`,key:`4ej97u`}],[`line`,{x1:`21`,x2:`16.65`,y1:`21`,y2:`16.65`,key:`13gj7c`}],[`line`,{x1:`8`,x2:`14`,y1:`11`,y2:`11`,key:`durymu`}]]};Cn.node;var wn=L(Cn),X=i(g(),1),Tn=P(),Z=N();function En(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function Dn(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var Q={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},$={common:{diffuse:{value:new cn(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new J},alphaMap:{value:null},alphaMapTransform:{value:new J},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new J}},envmap:{envMap:{value:null},envMapRotation:{value:new J},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new J}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new J}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new J},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new J},normalScale:{value:new G(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new J},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new J}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new J}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new J}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new cn(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new Y},probesMax:{value:new Y},probesResolution:{value:new Y}},points:{diffuse:{value:new cn(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new J},alphaTest:{value:0},uvTransform:{value:new J}},sprite:{diffuse:{value:new cn(16777215)},opacity:{value:1},center:{value:new G(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new J},alphaMap:{value:null},alphaMapTransform:{value:new J},alphaTest:{value:0}}},On={basic:{uniforms:Ht([$.common,$.specularmap,$.envmap,$.aomap,$.lightmap,$.fog]),vertexShader:Q.meshbasic_vert,fragmentShader:Q.meshbasic_frag},lambert:{uniforms:Ht([$.common,$.specularmap,$.envmap,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.fog,$.lights,{emissive:{value:new cn(0)},envMapIntensity:{value:1}}]),vertexShader:Q.meshlambert_vert,fragmentShader:Q.meshlambert_frag},phong:{uniforms:Ht([$.common,$.specularmap,$.envmap,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.fog,$.lights,{emissive:{value:new cn(0)},specular:{value:new cn(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Q.meshphong_vert,fragmentShader:Q.meshphong_frag},standard:{uniforms:Ht([$.common,$.envmap,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.roughnessmap,$.metalnessmap,$.fog,$.lights,{emissive:{value:new cn(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Q.meshphysical_vert,fragmentShader:Q.meshphysical_frag},toon:{uniforms:Ht([$.common,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.gradientmap,$.fog,$.lights,{emissive:{value:new cn(0)}}]),vertexShader:Q.meshtoon_vert,fragmentShader:Q.meshtoon_frag},matcap:{uniforms:Ht([$.common,$.bumpmap,$.normalmap,$.displacementmap,$.fog,{matcap:{value:null}}]),vertexShader:Q.meshmatcap_vert,fragmentShader:Q.meshmatcap_frag},points:{uniforms:Ht([$.points,$.fog]),vertexShader:Q.points_vert,fragmentShader:Q.points_frag},dashed:{uniforms:Ht([$.common,$.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Q.linedashed_vert,fragmentShader:Q.linedashed_frag},depth:{uniforms:Ht([$.common,$.displacementmap]),vertexShader:Q.depth_vert,fragmentShader:Q.depth_frag},normal:{uniforms:Ht([$.common,$.bumpmap,$.normalmap,$.displacementmap,{opacity:{value:1}}]),vertexShader:Q.meshnormal_vert,fragmentShader:Q.meshnormal_frag},sprite:{uniforms:Ht([$.sprite,$.fog]),vertexShader:Q.sprite_vert,fragmentShader:Q.sprite_frag},background:{uniforms:{uvTransform:{value:new J},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Q.background_vert,fragmentShader:Q.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new J}},vertexShader:Q.backgroundCube_vert,fragmentShader:Q.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Q.cube_vert,fragmentShader:Q.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Q.equirect_vert,fragmentShader:Q.equirect_frag},distance:{uniforms:Ht([$.common,$.displacementmap,{referencePosition:{value:new Y},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Q.distance_vert,fragmentShader:Q.distance_frag},shadow:{uniforms:Ht([$.lights,$.fog,{color:{value:new cn(0)},opacity:{value:1}}]),vertexShader:Q.shadow_vert,fragmentShader:Q.shadow_frag}};On.physical={uniforms:Ht([On.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new J},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new J},clearcoatNormalScale:{value:new G(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new J},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new J},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new J},sheen:{value:0},sheenColor:{value:new cn(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new J},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new J},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new J},transmissionSamplerSize:{value:new G},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new J},attenuationDistance:{value:0},attenuationColor:{value:new cn(0)},specularColor:{value:new cn(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new J},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new J},anisotropyVector:{value:new G},anisotropyMap:{value:null},anisotropyMapTransform:{value:new J}}]),vertexShader:Q.meshphysical_vert,fragmentShader:Q.meshphysical_frag};var kn={r:0,b:0,g:0},An=new nn,jn=new J;jn.set(-1,0,0,0,1,0,0,0,1);function Mn(e,t,n,r,i,a){let o=new cn(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new pt(new Ct(1,1,1),new Ue({name:`BackgroundCubeMaterial`,uniforms:se(On.backgroundCube.uniforms),vertexShader:On.backgroundCube.vertexShader,fragmentShader:On.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(An.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(jn),l.material.toneMapped=q.getTransfer(i.colorSpace)!==H,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new pt(new ue(2,2),new Ue({name:`BackgroundMaterial`,uniforms:se(On.background.uniforms),vertexShader:On.background.vertexShader,fragmentShader:On.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=q.getTransfer(i.colorSpace)!==H,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(kn,Et(e)),n.buffers.color.setClear(kn.r,kn.g,kn.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function Nn(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function Pn(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function Fn(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(ut(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&ut(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function In(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Ve,s=new J,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var Ln=4,Rn=6,zn=20,Bn=256,Vn=new ct,Hn=new cn,Un=null,Wn=0,Gn=0,Kn=!1,qn=new Y,Jn=new Y,Yn=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=qn}=i;Un=this._renderer.getRenderTarget(),Wn=this._renderer.getActiveCubeFace(),Gn=this._renderer.getActiveMipmapLevel(),Kn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=nr(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=tr(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Un,Wn,Gn),this._renderer.xr.enabled=Kn,e.scissorTest=!1,Qn(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Un=this._renderer.getRenderTarget(),Wn=this._renderer.getActiveCubeFace(),Gn=this._renderer.getActiveMipmapLevel(),Kn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Bt,minFilter:Bt,generateMipmaps:!1,type:qe,format:De,colorSpace:ot,depthBuffer:!1},r=Zn(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Zn(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=Xn(r)),this._blurMaterial=er(r,e,t),this._ggxMaterial=$n(r,e,t)}return r}_compileMaterial(e){let t=new pt(new tt,e);this._renderer.compile(t,Vn)}_sceneToCubeUV(e,t,n,r,i){let a=new ln(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(Hn),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new pt(new Ct,new yt({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(Hn),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;Qn(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=nr()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=tr());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Qn(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,Vn)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-Ln?n-d+Ln:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,Qn(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,Vn),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,Qn(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,Vn)}_blur(e,t,n,r){let i=this._pingPongRenderTarget,a=Math.min(r,Math.PI)/Math.SQRT2;this._blurPass(e,i,t,n,a),this._blurPass(i,e,n,n,a)}_blurPass(e,t,n,r,i){let a=this._renderer,o=this._blurMaterial,s=this._lodMeshes[r];s.material=o;let c=o.uniforms;c.envMap.value=e.texture,c.sigma.value=i,c.mipInt.value=this._lodMax-n;let l=this._sizeLods[r];Qn(t,3*l*(r>this._lodMax-Ln?r-this._lodMax+Ln:0),4*(this._cubeSize-l),3*l,2*l),a.setRenderTarget(t),a.render(s,Vn)}};function Xn(e){let t=[],n=[],r=e,i=e-Ln+1+Rn;for(let e=0;e<i;e++){let e=2**r;t.push(e);let i=1/(e-2),a=-i,o=1+i,s=[a,a,o,a,o,o,a,a,o,o,a,o],c=new Float32Array(108),l=new Float32Array(108);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];c.set(r,18*e);for(let t=0;t<6;t++){let n=s[t*2]*2-1,r=s[t*2+1]*2-1;e===0?Jn.set(1,r,n):e===1?Jn.set(-n,1,-r):e===2?Jn.set(-n,r,1):e===3?Jn.set(-1,r,-n):e===4?Jn.set(-n,-1,r):Jn.set(n,r,-1),Jn.toArray(l,(e*6+t)*3)}}let u=new tt;u.setAttribute(`position`,new bt(c,3)),u.setAttribute(`outputDirection`,new bt(l,3)),n.push(new pt(u,null)),r>Ln&&r--}return{lodMeshes:n,sizeLods:t}}function Zn(e,t,n){let r=new Xe(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Qn(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function $n(e,t,n){return new Ue({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:Bn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:rr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function er(e,t,n){return new Ue({name:`SphericalGaussianBlur`,defines:{SAMPLES:zn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:rr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function tr(){return new Ue({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:rr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function nr(){return new Ue({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:rr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function rr(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var ir=class extends Xe{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new pe(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Ct(5,5,5),i=new Ue({name:`CubemapFromEquirect`,uniforms:se(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new pt(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=Bt),new an(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function ar(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new ir(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Yn(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Yn(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function or(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&Pt(`WebGLRenderer: `+e+` extension not supported.`),t}}}function sr(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0||(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++),t}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?xe:ge)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function cr(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function lr(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:zt(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function ur(e,t,n){let r=new WeakMap,i=new Se;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new je(h,p,m,u);g.type=fn,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new G(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function dr(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var fr={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function pr(e,t,n,r,i,a){let o=new Xe(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),s=null,c=null,l=new tt;l.setAttribute(`position`,new Re([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute(`uv`,new Re([0,2,0,0,2,0],2));let u=new ft({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new pt(l,u),f=new ct(-1,1,1,-1,0,1),p=null,m=null,h=!1,g,_=null,v=[],y=!1;this.setSize=function(e,t){o.setSize(e,t),s!==null&&s.setSize(e,t),c!==null&&c.setSize(e,t);for(let n=0;n<v.length;n++){let r=v[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){v=e,y=v.length>0&&v[0].isRenderPass===!0;let t=o.width,n=o.height;v.length>0&&s===null&&(s=new Xe(t,n,{type:qe,depthBuffer:!1,stencilBuffer:!1}),c=new Xe(t,n,{type:qe,depthBuffer:!1,stencilBuffer:!1}));for(let e=0;e<v.length;e++){let r=v[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(h||e.toneMapping===0&&v.length===0)return!1;if(_=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return y===!1&&e.setRenderTarget(o),g=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return y},this.end=function(e,t){e.toneMapping=g,h=!0;let n=o,r=s;for(let i=0;i<v.length;i++){let a=v[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===s?c:s))}if(p!==e.outputColorSpace||m!==e.toneMapping){p=e.outputColorSpace,m=e.toneMapping,u.defines={},q.getTransfer(p)===`srgb`&&(u.defines.SRGB_TRANSFER=``);let t=fr[m];t&&(u.defines[t]=``),u.needsUpdate=!0}u.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(_),e.render(d,f),_=null,h=!1},this.isCompositing=function(){return h},this.dispose=function(){o.dispose(),s!==null&&s.dispose(),c!==null&&c.dispose(),l.dispose(),u.dispose()}}var mr=new ke,hr=new Te(1,1),gr=new je,_r=new de,vr=new pe,yr=[],br=[],xr=new Float32Array(16),Sr=new Float32Array(9),Cr=new Float32Array(4);function wr(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=yr[i];if(a===void 0&&(a=new Float32Array(i),yr[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function Tr(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function Er(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function Dr(e,t){let n=br[t];n===void 0&&(n=new Int32Array(t),br[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function Or(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function kr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Tr(n,t))return;e.uniform2fv(this.addr,t),Er(n,t)}}function Ar(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Tr(n,t))return;e.uniform3fv(this.addr,t),Er(n,t)}}function jr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Tr(n,t))return;e.uniform4fv(this.addr,t),Er(n,t)}}function Mr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Tr(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Er(n,t)}else{if(Tr(n,r))return;Cr.set(r),e.uniformMatrix2fv(this.addr,!1,Cr),Er(n,r)}}function Nr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Tr(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Er(n,t)}else{if(Tr(n,r))return;Sr.set(r),e.uniformMatrix3fv(this.addr,!1,Sr),Er(n,r)}}function Pr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Tr(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Er(n,t)}else{if(Tr(n,r))return;xr.set(r),e.uniformMatrix4fv(this.addr,!1,xr),Er(n,r)}}function Fr(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function Ir(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Tr(n,t))return;e.uniform2iv(this.addr,t),Er(n,t)}}function Lr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Tr(n,t))return;e.uniform3iv(this.addr,t),Er(n,t)}}function Rr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Tr(n,t))return;e.uniform4iv(this.addr,t),Er(n,t)}}function zr(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Br(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Tr(n,t))return;e.uniform2uiv(this.addr,t),Er(n,t)}}function Vr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Tr(n,t))return;e.uniform3uiv(this.addr,t),Er(n,t)}}function Hr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Tr(n,t))return;e.uniform4uiv(this.addr,t),Er(n,t)}}function Ur(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(hr.compareFunction=n.isReversedDepthBuffer()?518:515,a=hr):a=mr,n.setTexture2D(t||a,i)}function Wr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||_r,i)}function Gr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||vr,i)}function Kr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||gr,i)}function qr(e){switch(e){case 5126:return Or;case 35664:return kr;case 35665:return Ar;case 35666:return jr;case 35674:return Mr;case 35675:return Nr;case 35676:return Pr;case 5124:case 35670:return Fr;case 35667:case 35671:return Ir;case 35668:case 35672:return Lr;case 35669:case 35673:return Rr;case 5125:return zr;case 36294:return Br;case 36295:return Vr;case 36296:return Hr;case 35678:case 36198:case 36298:case 36306:case 35682:return Ur;case 35679:case 36299:case 36307:return Wr;case 35680:case 36300:case 36308:case 36293:return Gr;case 36289:case 36303:case 36311:case 36292:return Kr}}function Jr(e,t){e.uniform1fv(this.addr,t)}function Yr(e,t){let n=wr(t,this.size,2);e.uniform2fv(this.addr,n)}function Xr(e,t){let n=wr(t,this.size,3);e.uniform3fv(this.addr,n)}function Zr(e,t){let n=wr(t,this.size,4);e.uniform4fv(this.addr,n)}function Qr(e,t){let n=wr(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function $r(e,t){let n=wr(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function ei(e,t){let n=wr(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function ti(e,t){e.uniform1iv(this.addr,t)}function ni(e,t){e.uniform2iv(this.addr,t)}function ri(e,t){e.uniform3iv(this.addr,t)}function ii(e,t){e.uniform4iv(this.addr,t)}function ai(e,t){e.uniform1uiv(this.addr,t)}function oi(e,t){e.uniform2uiv(this.addr,t)}function si(e,t){e.uniform3uiv(this.addr,t)}function ci(e,t){e.uniform4uiv(this.addr,t)}function li(e,t,n){let r=this.cache,i=t.length,a=Dr(n,i);Tr(r,a)||(e.uniform1iv(this.addr,a),Er(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?hr:mr;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function ui(e,t,n){let r=this.cache,i=t.length,a=Dr(n,i);Tr(r,a)||(e.uniform1iv(this.addr,a),Er(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||_r,a[e])}function di(e,t,n){let r=this.cache,i=t.length,a=Dr(n,i);Tr(r,a)||(e.uniform1iv(this.addr,a),Er(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||vr,a[e])}function fi(e,t,n){let r=this.cache,i=t.length,a=Dr(n,i);Tr(r,a)||(e.uniform1iv(this.addr,a),Er(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||gr,a[e])}function pi(e){switch(e){case 5126:return Jr;case 35664:return Yr;case 35665:return Xr;case 35666:return Zr;case 35674:return Qr;case 35675:return $r;case 35676:return ei;case 5124:case 35670:return ti;case 35667:case 35671:return ni;case 35668:case 35672:return ri;case 35669:case 35673:return ii;case 5125:return ai;case 36294:return oi;case 36295:return si;case 36296:return ci;case 35678:case 36198:case 36298:case 36306:case 35682:return li;case 35679:case 36299:case 36307:return ui;case 35680:case 36300:case 36308:case 36293:return di;case 36289:case 36303:case 36311:case 36292:return fi}}var mi=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=qr(t.type)}},hi=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=pi(t.type)}},gi=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},_i=/(\w+)(\])?(\[|\.)?/g;function vi(e,t){e.seq.push(t),e.map[t.id]=t}function yi(e,t,n){let r=e.name,i=r.length;for(_i.lastIndex=0;;){let a=_i.exec(r),o=_i.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){vi(n,l===void 0?new mi(s,e,t):new hi(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new gi(s),vi(n,e)),n=e}}}var bi=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);yi(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function xi(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var Si=37297,Ci=0;function wi(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var Ti=new J;function Ei(e){q._getMatrix(Ti,q.workingColorSpace,e);let t=`mat3( ${Ti.elements.map(e=>e.toFixed(4))} )`;switch(q.getTransfer(e)){case Ut:return[t,`LinearTransferOETF`];case H:return[t,`sRGBTransferOETF`];default:return ut(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function Di(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+wi(e.getShaderSource(t),r)}return i}function Oi(e,t){let n=Ei(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var ki={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function Ai(e,t){let n=ki[t];return n===void 0?(ut(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var ji=new Y;function Mi(){return q.getLuminanceCoefficients(ji),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${ji.x.toFixed(4)}, ${ji.y.toFixed(4)}, ${ji.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function Ni(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(Ii).join(`
`)}function Pi(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function Fi(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function Ii(e){return e!==``}function Li(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Ri(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var zi=/^[ \t]*#include +<([\w\d./]+)>/gm;function Bi(e){return e.replace(zi,Hi)}var Vi=new Map;function Hi(e,t){let n=Q[t];if(n===void 0){let e=Vi.get(t);if(e!==void 0)n=Q[e],ut(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return Bi(n)}var Ui=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Wi(e){return e.replace(Ui,Gi)}function Gi(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Ki(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var qi={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Ji(e){return qi[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Yi={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function Xi(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:Yi[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Zi={302:`ENVMAP_MODE_REFRACTION`};function Qi(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Zi[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var $i={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function ea(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:$i[e.combine]||`ENVMAP_BLENDING_NONE`}function ta(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function na(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Ji(n),l=Xi(n),u=Qi(n),d=ea(n),f=ta(n),p=Ni(n),m=Pi(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(Ii).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(Ii).join(`
`),_.length>0&&(_+=`
`)):(g=[Ki(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(Ii).join(`
`),_=[Ki(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:Q.tonemapping_pars_fragment,n.toneMapping===0?``:Ai(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,Q.colorspace_pars_fragment,Oi(`linearToOutputTexel`,n.outputColorSpace),Mi(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(Ii).join(`
`)),o=Bi(o),o=Li(o,n),o=Ri(o,n),s=Bi(s),s=Li(s,n),s=Ri(s,n),o=Wi(o),s=Wi(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=xi(i,i.VERTEX_SHADER,y),S=xi(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=Di(i,x,`vertex`),n=Di(i,S,`fragment`);zt(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):ut(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new bi(i,h),T=Fi(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,Si)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Ci++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var ra=0,ia=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new aa(e),t.set(e,n)),n}},aa=class{constructor(e){this.id=ra++,this.code=e,this.usedTimes=0}};function oa(e){return e===1030||e===37490||e===36285}function sa(e,t,n,r,i,a){let o=new Ze,s=new ia,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&ut(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,ee;if(C){let e=On[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,ee=t.id}let A=e.getRenderTarget(),j=e.state.buffers.depth.getReversed(),M=h.isInstancedMesh===!0,N=h.isBatchedMesh===!0,te=!!i.map,P=!!i.matcap,F=!!x,ne=!!i.aoMap,re=!!i.lightMap,ie=!!i.bumpMap&&i.wireframe===!1,I=!!i.normalMap,ae=!!i.displacementMap,L=!!i.emissiveMap,oe=!!i.metalnessMap,R=!!i.roughnessMap,se=i.anisotropy>0,z=i.clearcoat>0,ce=i.dispersion>0,B=i.retroreflectivity>0,V=i.iridescence>0,le=i.sheen>0,H=i.transmission>0,ue=se&&!!i.anisotropyMap,de=z&&!!i.clearcoatMap,fe=z&&!!i.clearcoatNormalMap,pe=z&&!!i.clearcoatRoughnessMap,me=V&&!!i.iridescenceMap,he=V&&!!i.iridescenceThicknessMap,ge=le&&!!i.sheenColorMap,U=le&&!!i.sheenRoughnessMap,_e=!!i.specularMap,ve=!!i.specularColorMap,ye=!!i.specularIntensityMap,be=H&&!!i.transmissionMap,xe=H&&!!i.thicknessMap,W=!!i.gradientMap,Se=!!i.alphaMap,Ce=i.alphaTest>0,G=!!i.alphaHash,K=!!i.extensions,we=0;i.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(we=e.toneMapping);let Te={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:ee,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:N,batchingColor:N&&h._colorsTexture!==null,instancing:M,instancingColor:M&&h.instanceColor!==null,instancingMorph:M&&h.morphTexture!==null,outputColorSpace:A===null?e.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:q.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:te,matcap:P,envMap:F,envMapMode:F&&x.mapping,envMapCubeUVHeight:S,aoMap:ne,lightMap:re,bumpMap:ie,normalMap:I,displacementMap:ae,emissiveMap:L,normalMapObjectSpace:I&&i.normalMapType===1,normalMapTangentSpace:I&&i.normalMapType===0,packedNormalMap:I&&i.normalMapType===0&&oa(i.normalMap.format),metalnessMap:oe,roughnessMap:R,anisotropy:se,anisotropyMap:ue,clearcoat:z,clearcoatMap:de,clearcoatNormalMap:fe,clearcoatRoughnessMap:pe,dispersion:ce,retroreflection:B,iridescence:V,iridescenceMap:me,iridescenceThicknessMap:he,sheen:le,sheenColorMap:ge,sheenRoughnessMap:U,specularMap:_e,specularColorMap:ve,specularIntensityMap:ye,transmission:H,transmissionMap:be,thicknessMap:xe,gradientMap:W,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Se,alphaTest:Ce,alphaHash:G,combine:i.combine,mapUv:te&&m(i.map.channel),aoMapUv:ne&&m(i.aoMap.channel),lightMapUv:re&&m(i.lightMap.channel),bumpMapUv:ie&&m(i.bumpMap.channel),normalMapUv:I&&m(i.normalMap.channel),displacementMapUv:ae&&m(i.displacementMap.channel),emissiveMapUv:L&&m(i.emissiveMap.channel),metalnessMapUv:oe&&m(i.metalnessMap.channel),roughnessMapUv:R&&m(i.roughnessMap.channel),anisotropyMapUv:ue&&m(i.anisotropyMap.channel),clearcoatMapUv:de&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:fe&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:pe&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:me&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:he&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:ge&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:U&&m(i.sheenRoughnessMap.channel),specularMapUv:_e&&m(i.specularMap.channel),specularColorMapUv:ve&&m(i.specularColorMap.channel),specularIntensityMapUv:ye&&m(i.specularIntensityMap.channel),transmissionMapUv:be&&m(i.transmissionMap.channel),thicknessMapUv:xe&&m(i.thicknessMap.channel),alphaMapUv:Se&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(I||se),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(te||Se),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&I===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:j,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:we,decodeVideoTexture:te&&i.map.isVideoTexture===!0&&q.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:L&&i.emissiveMap.isVideoTexture===!0&&q.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:K&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(K&&i.extensions.multiDraw===!0||N)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Te.vertexUv1s=c.has(1),Te.vertexUv2s=c.has(2),Te.vertexUv3s=c.has(3),c.clear(),Te}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=On[t];n=we.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new na(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function ca(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function la(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function ua(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function da(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||la),r.length>1&&r.sort(t||ua),i.length>1&&i.sort(t||ua)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function fa(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new da,e.set(t,[i])):n>=r.length?(i=new da,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function pa(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new Y,color:new cn};break;case`SpotLight`:n={position:new Y,direction:new Y,color:new cn,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new Y,color:new cn,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new Y,skyColor:new cn,groundColor:new cn};break;case`RectAreaLight`:n={color:new cn,position:new Y,halfWidth:new Y,halfHeight:new Y}}return e[t.id]=n,n}}}function ma(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new G};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new G};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new G,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var ha=0;function ga(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function _a(e){let t=new pa,n=ma(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new Y);let i=new Y,a=new nn,o=new nn;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(ga);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=$.LTC_FLOAT_1,r.rectAreaLTC2=$.LTC_FLOAT_2):(r.rectAreaLTC1=$.LTC_HALF_1,r.rectAreaLTC2=$.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=ha++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function va(e){let t=new _a(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function ya(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new va(e),t.set(n,[a])):r>=i.length?(a=new va(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var ba=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,xa=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Sa=[new Y(1,0,0),new Y(-1,0,0),new Y(0,1,0),new Y(0,-1,0),new Y(0,0,1),new Y(0,0,-1)],Ca=[new Y(0,-1,0),new Y(0,-1,0),new Y(0,0,1),new Y(0,0,-1),new Y(0,-1,0),new Y(0,-1,0)],wa=new nn,Ta=new Y,Ea=new Y;function Da(e,t,n){let r=new B,i=new G,a=new G,o=new Se,s=new Kt,c=new Rt,l={},u=n.maxTextureSize,d={0:1,1:0,2:2},f=new Ue({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new G},radius:{value:4}},vertexShader:ba,fragmentShader:xa}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let m=new tt;m.setAttribute(`position`,new bt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let h=new pt(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let _=this.type;this.render=function(t,n,s){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||t.length===0)return;this.type===2&&(ut(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let c=e.getRenderTarget(),l=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.state;f.setBlending(0),f.buffers.depth.getReversed()===!0?f.buffers.color.setClear(0,0,0,0):f.buffers.color.setClear(1,1,1,1),f.buffers.depth.setTest(!0),f.setScissorTest(!1);let p=_!==this.type;p&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let c=0,l=t.length;c<l;c++){let l=t[c],d=l.shadow;if(d===void 0){ut(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let m=d.getFrameExtents();i.multiply(m),a.copy(d.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(a.x=Math.floor(u/m.x),i.x=a.x*m.x,d.mapSize.x=a.x),i.y>u&&(a.y=Math.floor(u/m.y),i.y=a.y*m.y,d.mapSize.y=a.y));let h=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=h,d.map===null||p===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(l.isPointLight){ut(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new Xe(i.x,i.y,{format:Nt,type:qe,minFilter:Bt,magFilter:Bt,generateMipmaps:!1}),d.map.texture.name=l.name+`.shadowMap`,d.map.depthTexture=new Te(i.x,i.y,fn),d.map.depthTexture.name=l.name+`.shadowMapDepth`,d.map.depthTexture.format=z,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=rt,d.map.depthTexture.magFilter=rt}else l.isPointLight?(d.map=new ir(i.x),d.map.depthTexture=new He(i.x,ye)):(d.map=new Xe(i.x,i.y),d.map.depthTexture=new Te(i.x,i.y,ye)),d.map.depthTexture.name=l.name+`.shadowMap`,d.map.depthTexture.format=z,this.type===1?(d.map.depthTexture.compareFunction=h?518:515,d.map.depthTexture.minFilter=Bt,d.map.depthTexture.magFilter=Bt):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=rt,d.map.depthTexture.magFilter=rt);d.camera.updateProjectionMatrix()}d.map.isWebGLCubeRenderTarget!==!0&&(d.map.width!==i.x||d.map.height!==i.y)&&d.map.setSize(i.x,i.y);let g=d.map.isWebGLCubeRenderTarget?6:d.getViewportCount();l.isPointLight!==!0&&d.updateMatrices(l,s);for(let t=0;t<g;t++){let i=d.getCamera(t);if(l.isPointLight){let e=d.camera,n=d.matrix,r=l.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),Ta.setFromMatrixPosition(l.matrixWorld),e.position.copy(Ta),Ea.copy(e.position),Ea.add(Sa[t]),e.up.copy(Ca[t]),e.lookAt(Ea),e.updateMatrixWorld(),n.makeTranslation(-Ta.x,-Ta.y,-Ta.z),wa.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(wa,e.coordinateSystem,e.reversedDepth)}if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),f.viewport(o)}r=d.getFrustum(t),b(n,s,i,l,this.type)}d.isPointLightShadow!==!0&&this.type===3&&v(d,s),d.needsUpdate=!1}_=this.type,g.needsUpdate=!1,e.setRenderTarget(c,l,d)};function v(n,r){let a=t.update(h);f.defines.VSM_SAMPLES!==n.blurSamples&&(f.defines.VSM_SAMPLES=n.blurSamples,p.defines.VSM_SAMPLES=n.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),n.mapPass===null?n.mapPass=new Xe(i.x,i.y,{format:Nt,type:qe}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),f.uniforms.shadow_pass.value=n.map.depthTexture,f.uniforms.resolution.value.set(n.map.width,n.map.height),f.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,f,h,null),p.uniforms.shadow_pass.value=n.mapPass.texture,p.uniforms.resolution.value.set(n.map.width,n.map.height),p.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,p,h,null)}function y(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?c:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=l[e];r===void 0&&(r={},l[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,x)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?d[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function b(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||n.intersectsFrustum(r))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=y(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=y(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)b(c[e],i,a,o,s)}function x(e){e.target.removeEventListener(`dispose`,x);for(let t in l){let n=l[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function Oa(e,t){function n(){let t=!1,n=new Se,r=null,i=new Se(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?oe(e.DEPTH_TEST):R(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=xt[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?oe(e.STENCIL_TEST):R(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new cn(0,0,0),T=0,E=!1,D=null,O=null,k=null,ee=null,A=null,j=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),M=!1,N=0,te=e.getParameter(e.VERSION);te.indexOf(`WebGL`)===-1?te.indexOf(`OpenGL ES`)!==-1&&(N=parseFloat(/^OpenGL ES (\d)/.exec(te)[1]),M=N>=2):(N=parseFloat(/^WebGL (\d)/.exec(te)[1]),M=N>=1);let P=null,F={},ne=e.getParameter(e.SCISSOR_BOX),re=e.getParameter(e.VIEWPORT),ie=new Se().fromArray(ne),I=new Se().fromArray(re);function ae(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let L={};L[e.TEXTURE_2D]=ae(e.TEXTURE_2D,e.TEXTURE_2D,1),L[e.TEXTURE_CUBE_MAP]=ae(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),L[e.TEXTURE_2D_ARRAY]=ae(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),L[e.TEXTURE_3D]=ae(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),oe(e.DEPTH_TEST),o.setFunc(3),ue(!1),de(1),oe(e.CULL_FACE),le(0);function oe(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function R(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function se(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function z(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function ce(t){return h!==t&&(e.useProgram(t),h=t,!0)}let B={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};B[103]=e.MIN,B[104]=e.MAX;let V={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function le(t,n,r,i,a,o,s,c,l,u){if(t===0)g===!0&&(R(e.BLEND),g=!1);else if(g===!1&&(oe(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:zt(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:zt(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:zt(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:zt(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}}else a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(B[n],B[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(V[r],V[i],V[o],V[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function H(t,n){t.side===2?R(e.CULL_FACE):oe(e.CULL_FACE);let r=t.side===1;n&&(r=!r),ue(r),t.blending===1&&t.transparent===!1?le(0):le(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),pe(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?oe(e.SAMPLE_ALPHA_TO_COVERAGE):R(e.SAMPLE_ALPHA_TO_COVERAGE)}function ue(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function de(t){t===0?R(e.CULL_FACE):(oe(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function fe(t){t!==k&&(M&&e.lineWidth(t),k=t)}function pe(t,n,r){t?(oe(e.POLYGON_OFFSET_FILL),(ee!==n||A!==r)&&(ee=n,A=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):R(e.POLYGON_OFFSET_FILL)}function me(t){t?oe(e.SCISSOR_TEST):R(e.SCISSOR_TEST)}function he(t){t===void 0&&(t=e.TEXTURE0+j-1),P!==t&&(e.activeTexture(t),P=t)}function ge(t,n,r){r===void 0&&(r=P===null?e.TEXTURE0+j-1:P);let i=F[r];i===void 0&&(i={type:void 0,texture:void 0},F[r]=i),(i.type!==t||i.texture!==n)&&(P!==r&&(e.activeTexture(r),P=r),e.bindTexture(t,n||L[t]),i.type=t,i.texture=n)}function U(){let t=F[P];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function _e(){try{e.compressedTexImage2D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function ve(){try{e.compressedTexImage3D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function ye(){try{e.texSubImage2D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function be(){try{e.texSubImage3D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function xe(){try{e.compressedTexSubImage2D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function W(){try{e.compressedTexSubImage3D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function Ce(){try{e.texStorage2D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function G(){try{e.texStorage3D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function K(){try{e.texImage2D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function we(){try{e.texImage3D(...arguments)}catch(e){zt(`WebGLState:`,e)}}function Te(t){return d[t]===void 0?e.getParameter(t):d[t]}function Ee(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function De(t){ie.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),ie.copy(t))}function Oe(t){I.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),I.copy(t))}function ke(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function Ae(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function je(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},P=null,F={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new cn(0,0,0),T=0,E=!1,D=null,O=null,k=null,ee=null,A=null,ie.set(0,0,e.canvas.width,e.canvas.height),I.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:oe,disable:R,bindFramebuffer:se,drawBuffers:z,useProgram:ce,setBlending:le,setMaterial:H,setFlipSided:ue,setCullFace:de,setLineWidth:fe,setPolygonOffset:pe,setScissorTest:me,activeTexture:he,bindTexture:ge,unbindTexture:U,compressedTexImage2D:_e,compressedTexImage3D:ve,texImage2D:K,texImage3D:we,pixelStorei:Ee,getParameter:Te,updateUBOMapping:ke,uniformBlockBinding:Ae,texStorage2D:Ce,texStorage3D:G,texSubImage2D:ye,texSubImage3D:be,compressedTexSubImage2D:xe,compressedTexSubImage3D:W,scissor:De,viewport:Oe,reset:je}}function ka(e,t,n,r,i,a,o){let s=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,c=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),l=new G,u=new WeakMap,d=new Set,f,p=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function h(e,t){return m?new OffscreenCanvas(e,t):Qt(`canvas`)}function g(e,t,n){let r=1,i=_e(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);f===void 0&&(f=h(n,a));let o=t?h(n,a):f;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),ut(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&ut(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function _(e){return e.generateMipmaps}function v(t){e.generateMipmap(t)}function y(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function b(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];ut(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||ut(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?Ut:q.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function x(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,ut(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function S(e,t){return _(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function C(e){let t=e.target;t.removeEventListener(`dispose`,C),T(t),t.isVideoTexture&&u.delete(t),t.isHTMLTexture&&d.delete(t)}function w(e){let t=e.target;t.removeEventListener(`dispose`,w),D(t)}function T(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=p.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&E(e),Object.keys(i).length===0&&p.delete(n)}r.remove(e)}function E(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=p.get(i);delete a[n.__cacheKey],o.memory.textures--}function D(t){let n=r.get(t);if(t.depthTexture&&(t.depthTexture.dispose(),r.remove(t.depthTexture)),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let i=t.textures;for(let t=0,n=i.length;t<n;t++){let n=r.get(i[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(i[t])}r.remove(t)}let O=0;function k(){O=0}function ee(){return O}function A(e){O=e}function j(){let e=O;return e>=i.maxTextures&&ut(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+i.maxTextures),O+=1,e}function M(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function N(t,i){let a=r.get(t);if(t.isVideoTexture&&ge(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)ut(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)ut(`WebGLRenderer: Texture marked for update but image is incomplete`);else{R(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function te(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?R(a,t,i):(t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i))}function P(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?R(a,t,i):n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function F(t,i){let a=r.get(t);t.isCubeDepthTexture!==!0&&t.version>0&&a.__version!==t.version?se(a,t,i):n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let ne={[wt]:e.REPEAT,[st]:e.CLAMP_TO_EDGE,[St]:e.MIRRORED_REPEAT},re={[rt]:e.NEAREST,[dn]:e.NEAREST_MIPMAP_NEAREST,[rn]:e.NEAREST_MIPMAP_LINEAR,[Bt]:e.LINEAR,[Dt]:e.LINEAR_MIPMAP_NEAREST,[Jt]:e.LINEAR_MIPMAP_LINEAR},ie={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function I(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&ut(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,ne[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,ne[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,ne[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,re[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,re[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,ie[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function ae(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,C));let i=n.source,a=p.get(i);a===void 0&&(a={},p.set(i,a));let s=M(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&E(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function L(e,t,n){return Math.floor(Math.floor(e/n)/t)}function oe(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=L(n.start,r.width,4),c=L(t.start,r.width,4);n.start<=i+1&&a===c&&L(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function R(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=ae(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let f=r.get(u);if(u.version!==f.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=q.getPrimaries(q.workingColorSpace),r=o.colorSpace===``?null:q.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=g(o.image,!1,i.maxTextureSize);t=U(o,t);let r=a.convert(o.format,o.colorSpace),p=a.convert(o.type),m=b(o.internalFormat,r,p,o.normalized,o.colorSpace,o.isVideoTexture);I(c,o);let h,y=o.mipmaps,C=o.isVideoTexture!==!0,w=f.__version===void 0||l===!0,T=u.dataReady,E=S(o,t);if(o.isDepthTexture)m=x(o.format===Ot,o.type),w&&(C?n.texStorage2D(e.TEXTURE_2D,1,m,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,null));else if(o.isDataTexture){if(y.length>0){C&&w&&n.texStorage2D(e.TEXTURE_2D,E,m,y[0].width,y[0].height);for(let t=0,i=y.length;t<i;t++)h=y[t],C?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data);o.generateMipmaps=!1}else C?(w&&n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height),T&&oe(o,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,t.data)}else if(o.isCompressedTexture){if(o.isCompressedArrayTexture){C&&w&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,y[0].width,y[0].height,t.depth);for(let i=0,a=y.length;i<a;i++)if(h=y[i],o.format!==1023){if(r!==null){if(C){if(T){if(o.layerUpdates.size>0){let t=qt(h.width,h.height,o.format,o.type);for(let a of o.layerUpdates){let o=h.data.subarray(a*t/h.data.BYTES_PER_ELEMENT,(a+1)*t/h.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,h.width,h.height,1,r,o)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,h.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,h.data,0,0)}else ut(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else C?T&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,p,h.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,r,p,h.data);o.layerUpdates.size>0&&o.clearLayerUpdates()}else{C&&w&&n.texStorage2D(e.TEXTURE_2D,E,m,y[0].width,y[0].height);for(let t=0,i=y.length;t<i;t++)h=y[t],o.format===1023?C?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data):r===null?ut(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):C?T&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,h.data):n.compressedTexImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,h.data)}}else if(o.isDataArrayTexture){if(C){if(w&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,t.width,t.height,t.depth),T){if(o.layerUpdates.size>0){let i=qt(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,m,t.width,t.height,t.depth,0,r,p,t.data)}else if(o.isData3DTexture)C?(w&&n.texStorage3D(e.TEXTURE_3D,E,m,t.width,t.height,t.depth),T&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isFramebufferTexture){if(w){if(C)n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<E;t++)n.texImage2D(e.TEXTURE_2D,t,m,i,a,0,r,p,null),i>>=1,a>>=1}}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),d.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of d)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(y.length>0){if(C&&w){let t=_e(y[0]);n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height)}for(let t=0,i=y.length;t<i;t++)h=y[t],C?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,h):n.texImage2D(e.TEXTURE_2D,t,m,r,p,h);o.generateMipmaps=!1}else if(C){if(w){let r=_e(t);n.texStorage2D(e.TEXTURE_2D,E,m,r.width,r.height)}T&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,m,r,p,t);_(o)&&v(c),f.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function se(t,o,s){if(o.image.length!==6)return;let c=ae(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=q.getPrimaries(q.workingColorSpace),r=o.colorSpace===``?null:q.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=g(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=U(o,m[e]);let h=m[0],y=a.convert(o.format,o.colorSpace),x=a.convert(o.type),C=b(o.internalFormat,y,x,o.normalized,o.colorSpace),w=o.isVideoTexture!==!0,T=u.__version===void 0||c===!0,E=l.dataReady,D=S(o,h);I(e.TEXTURE_CUBE_MAP,o);let O;if(f){w&&T&&n.texStorage2D(e.TEXTURE_CUBE_MAP,D,C,h.width,h.height);for(let t=0;t<6;t++){O=m[t].mipmaps;for(let r=0;r<O.length;r++){let i=O[r];o.format===1023?w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,y,x,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,C,i.width,i.height,0,y,x,i.data):y===null?ut(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):w?E&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,y,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,C,i.width,i.height,0,i.data)}}}else{if(O=o.mipmaps,w&&T){O.length>0&&D++;let t=_e(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,D,C,t.width,t.height)}for(let t=0;t<6;t++)if(p){w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,y,x,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,C,m[t].width,m[t].height,0,y,x,m[t].data);for(let r=0;r<O.length;r++){let i=O[r].image[t].image;w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,y,x,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,C,i.width,i.height,0,y,x,i.data)}}else{w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,y,x,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,C,y,x,m[t]);for(let r=0;r<O.length;r++){let i=O[r];w?E&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,y,x,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,C,y,x,i.image[t])}}}_(o)&&v(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function z(t,i,o,c,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=b(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),he(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,c,l,h.__webglTexture,0,me(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,c,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function ce(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=x(n.stencilBuffer,a),c=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;he(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,me(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,me(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,c,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],c=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=b(o.internalFormat,c,l,o.normalized,o.colorSpace);he(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,me(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,me(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function B(t,i,o){let c=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let l=r.get(i.depthTexture);if(l.__renderTarget=i,l.__webglTexture&&i.depthTexture.image.width===i.width&&i.depthTexture.image.height===i.height||(i.depthTexture.image.width=i.width,i.depthTexture.image.height=i.height,i.depthTexture.needsUpdate=!0),c){if(l.__webglInit===void 0&&(l.__webglInit=!0,i.depthTexture.addEventListener(`dispose`,C)),l.__webglTexture===void 0){l.__webglTexture=e.createTexture(),n.bindTexture(e.TEXTURE_CUBE_MAP,l.__webglTexture),I(e.TEXTURE_CUBE_MAP,i.depthTexture);let t=a.convert(i.depthTexture.format),r=a.convert(i.depthTexture.type),o;i.depthTexture.format===1026?o=e.DEPTH_COMPONENT24:i.depthTexture.format===1027&&(o=e.DEPTH24_STENCIL8);for(let n=0;n<6;n++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0,o,i.width,i.height,0,t,r,null)}}else N(i.depthTexture,0);let u=l.__webglTexture,d=me(i),f=c?e.TEXTURE_CUBE_MAP_POSITIVE_X+o:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)he(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)he(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function V(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)B(i.__webglFramebuffer[e],t,e);else{let e=t.texture.mipmaps;e&&e.length>0?B(i.__webglFramebuffer[0],t,0):B(i.__webglFramebuffer,t,0)}}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),ce(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else{let r=t.texture.mipmaps;if(r&&r.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),ce(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function le(t,n,i){let a=r.get(t);n!==void 0&&z(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&V(t)}function H(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,w);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps&&i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&he(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=b(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=me(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),ce(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),I(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps&&i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)z(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else z(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);_(i)&&v(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),I(c,a),z(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),_(a)&&v(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),I(r,i),i.mipmaps&&i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)z(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else z(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);_(i)&&v(r),n.unbindTexture()}t.depthBuffer&&V(t)}function ue(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(_(a)){let t=y(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),v(t),n.unbindTexture()}}}let de=[],fe=[];function pe(t){if(t.samples>0){if(he(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer);let f=t.texture.mipmaps;f&&f.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),c===!0&&(de.length=0,fe.length=0,de.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&(de.push(l),fe.push(l),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,fe)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,de))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&c){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function me(e){return Math.min(i.maxSamples,e.samples)}function he(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function ge(e){let t=o.render.frame;u.get(e)!==t&&(u.set(e,t),e.update())}function U(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(q.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&ut(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):zt(`WebGLTextures: Unsupported texture color space:`,n)),t}function _e(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(l.width=e.naturalWidth||e.width,l.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(l.width=e.displayWidth,l.height=e.displayHeight):(l.width=e.width,l.height=e.height),l}this.allocateTextureUnit=j,this.resetTextureUnits=k,this.getTextureUnits=ee,this.setTextureUnits=A,this.setTexture2D=N,this.setTexture2DArray=te,this.setTexture3D=P,this.setTextureCube=F,this.rebindTextures=le,this.setupRenderTarget=H,this.updateRenderTargetMipmap=ue,this.updateMultisampleRenderTarget=pe,this.setupDepthRenderbuffer=V,this.setupFrameBufferTexture=z,this.useMultisampledRTT=he,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function Aa(e,t){function n(n,r=``){let i,a=q.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var ja=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Ma=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Na=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new K(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Ue({vertexShader:ja,fragmentShader:Ma,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new pt(new ue(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Pa=class extends be{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=typeof XRWebGLBinding<`u`,h=new Na,g={},_=t.getContextAttributes(),v=null,y=null,b=[],x=[],S=new G,C=null,w=null,T=new ln;T.viewport=new Se;let E=new ln;E.viewport=new Se;let D=[T,E],O=new Wt,k=null,ee=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=b[e];return t===void 0&&(t=new et,b[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=b[e];return t===void 0&&(t=new et,b[e]=t),t.getGripSpace()},this.getHand=function(e){let t=b[e];return t===void 0&&(t=new et,b[e]=t),t.getHandSpace()};function A(e){let t=x.indexOf(e.inputSource);if(t===-1)return;let n=b[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function j(){r.removeEventListener(`select`,A),r.removeEventListener(`selectstart`,A),r.removeEventListener(`selectend`,A),r.removeEventListener(`squeeze`,A),r.removeEventListener(`squeezestart`,A),r.removeEventListener(`squeezeend`,A),r.removeEventListener(`end`,j),r.removeEventListener(`inputsourceschange`,M);for(let e=0;e<b.length;e++){let t=x[e];t!==null&&(x[e]=null,b[e].disconnect(t))}k=null,ee=null,h.reset();for(let e in g)delete g[e];if(e.setRenderTarget(v),f=null,d=null,u=null,r=null,y=null,I.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(S.width,S.height,!1),w!==null){let e=w.camera;e.fov=w.fov,e.zoom=w.zoom,e.updateProjectionMatrix(),w=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&ut(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&ut(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(v=e.getRenderTarget(),r.addEventListener(`select`,A),r.addEventListener(`selectstart`,A),r.addEventListener(`selectend`,A),r.addEventListener(`squeeze`,A),r.addEventListener(`squeezestart`,A),r.addEventListener(`squeezeend`,A),r.addEventListener(`end`,j),r.addEventListener(`inputsourceschange`,M),_.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(S),m&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;_.depth&&(o=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=_.stencil?Ot:z,a=_.stencil?V:ye);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new Xe(d.textureWidth,d.textureHeight,{format:De,type:ze,depthTexture:new Te(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new Xe(f.framebufferWidth,f.framebufferHeight,{format:De,type:ze,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),I.setContext(r),I.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return h.getDepthTexture()};function M(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=x.indexOf(n);r>=0&&(x[r]=null,b[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=x.indexOf(n);if(r===-1){for(let e=0;e<b.length;e++)if(e>=x.length){x.push(n),r=e;break}else if(x[e]===null){x[e]=n,r=e;break}if(r===-1)break}let i=b[r];i&&i.connect(n)}}let N=new Y,te=new Y;function P(e,t,n){N.setFromMatrixPosition(t.matrixWorld),te.setFromMatrixPosition(n.matrixWorld);let r=N.distanceTo(te),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function F(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;h.texture!==null&&(h.depthNear>0&&(t=h.depthNear),h.depthFar>0&&(n=h.depthFar)),O.near=E.near=T.near=t,O.far=E.far=T.far=n,(k!==O.near||ee!==O.far)&&(r.updateRenderState({depthNear:O.near,depthFar:O.far}),k=O.near,ee=O.far),O.layers.mask=e.layers.mask|6,T.layers.mask=O.layers.mask&-5,E.layers.mask=O.layers.mask&-3;let i=e.parent,a=O.cameras;F(O,i);for(let e=0;e<a.length;e++)F(a[e],i);a.length===2?P(O,T,E):O.projectionMatrix.copy(T.projectionMatrix),w===null&&e.isPerspectiveCamera&&(w={camera:e,fov:e.fov,zoom:e.zoom}),ne(e,O,i)};function ne(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=Ne*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return h.texture!==null},this.getDepthSensingMesh=function(){return h.getMesh(O)},this.getCameraTexture=function(e){return g[e]};let re=null;function ie(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let i=!1;t.length!==O.cameras.length&&(O.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(y,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(y))}let o=D[n];o===void 0&&(o=new ln,o.layers.enable(n),o.viewport=new Se,D[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(O.matrix.copy(o.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),i===!0&&O.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&m){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&h.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&m){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=g[n];e||(e=new K,g[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<b.length;e++){let t=x[e],n=b[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}re&&re(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let I=new En;I.setAnimationLoop(ie),this.setAnimationLoop=function(e){re=e},this.dispose=function(){}}},Fa=new nn,Ia=new J;Ia.set(-1,0,0,0,1,0,0,0,1);function La(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Et(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(Fa.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(Ia),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function Ra(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return zt(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?ut(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):ut(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var za=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Ba=null;function Va(){return Ba===null&&(Ba=new At(za,16,16,Nt,qe),Ba.name=`DFG_LUT`,Ba.minFilter=Bt,Ba.magFilter=Bt,Ba.wrapS=st,Ba.wrapT=st,Ba.generateMipmaps=!1,Ba.needsUpdate=!0),Ba}var Ha=class{constructor(e={}){let{canvas:t=mt(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=ze}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([Ae,tn,It]),g=new Set([ze,ye,_e,V,Ke,Je]),_=new Uint32Array(4),v=new Int32Array(4),y=new Y,b=null,x=null,S=[],C=[],w=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let T=this,E=!1,D=null,O=null,k=null,ee=null;this._outputColorSpace=Be;let A=0,j=0,M=null,N=-1,te=null,P=new Se,F=new Se,ne=null,re=new cn(0),ie=0,I=t.width,ae=t.height,L=1,oe=null,R=null,se=new Se(0,0,I,ae),z=new Se(0,0,I,ae),ce=!1,le=new B,H=!1,ue=!1,de=new nn,fe=new Y,pe=new Se,me={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},he=!1;function ge(){return M===null?L:1}let U=n;function ve(e,n){return t.getContext(e,n)}let be,xe,W,Ce,G,K,we,Te,Ee,De,Oe,ke,je,Me,Ne,Pe,Fe,Ie,Le,Re,Ve,He,Ue;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r186`),t.addEventListener(`webglcontextlost`,Ye,!1),t.addEventListener(`webglcontextrestored`,Ze,!1),t.addEventListener(`webglcontextcreationerror`,$e,!1),U===null){let t=`webgl2`;if(U=ve(t,e),U===null)throw ve(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}We()}catch(e){throw t.removeEventListener(`webglcontextlost`,Ye,!1),t.removeEventListener(`webglcontextrestored`,Ze,!1),t.removeEventListener(`webglcontextcreationerror`,$e,!1),zt(`WebGLRenderer: `+e.message),e}function We(){be=new or(U),be.init(),Ve=new Aa(U,be),xe=new Fn(U,be,e,Ve),W=new Oa(U,be),xe.reversedDepthBuffer&&d&&W.buffers.depth.setReversed(!0),O=U.createFramebuffer(),k=U.createFramebuffer(),ee=U.createFramebuffer(),Ce=new lr(U),G=new ca,K=new ka(U,be,W,G,xe,Ve,Ce),we=new ar(T),Te=new Dn(U),He=new Nn(U,Te),Ee=new sr(U,Te,Ce,He),De=new dr(U,Ee,Te,He,Ce),Ie=new ur(U,xe,K),Ne=new In(G),Oe=new sa(T,we,be,xe,He,Ne),ke=new La(T,G),je=new fa,Me=new ya(be),Fe=new Mn(T,we,W,De,p,s),Pe=new Da(T,De,xe),Ue=new Ra(U,Ce,xe,W),Le=new Pn(U,be,Ce),Re=new cr(U,be,Ce),Ce.programs=Oe.programs,T.capabilities=xe,T.extensions=be,T.properties=G,T.renderLists=je,T.shadowMap=Pe,T.state=W,T.info=Ce}m!==1009&&(w=new pr(m,t.width,t.height,o,r,i));let Ge=new Pa(T,U);this.xr=Ge,this.getContext=function(){return U},this.getContextAttributes=function(){return U.getContextAttributes()},this.forceContextLoss=function(){let e=be.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=be.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return L},this.setPixelRatio=function(e){e!==void 0&&(L=e,this.setSize(I,ae,!1))},this.getSize=function(e){return e.set(I,ae)},this.setSize=function(e,n,r=!0){Ge.isPresenting?ut(`WebGLRenderer: Can't change size while VR device is presenting.`):(I=e,ae=n,t.width=Math.floor(e*L),t.height=Math.floor(n*L),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),w!==null&&w.setSize(t.width,t.height),this.setViewport(0,0,e,n))},this.getDrawingBufferSize=function(e){return e.set(I*L,ae*L).floor()},this.setDrawingBufferSize=function(e,n,r){I=e,ae=n,L=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009)zt(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);else{if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){ut(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}w.setEffects(e||[])}},this.getCurrentViewport=function(e){return e.copy(P)},this.getViewport=function(e){return e.copy(se)},this.setViewport=function(e,t,n,r){e.isVector4?se.set(e.x,e.y,e.z,e.w):se.set(e,t,n,r),W.viewport(P.copy(se).multiplyScalar(L).round())},this.getScissor=function(e){return e.copy(z)},this.setScissor=function(e,t,n,r){e.isVector4?z.set(e.x,e.y,e.z,e.w):z.set(e,t,n,r),W.scissor(F.copy(z).multiplyScalar(L).round())},this.getScissorTest=function(){return ce},this.setScissorTest=function(e){W.setScissorTest(ce=e)},this.setOpaqueSort=function(e){oe=e},this.setTransparentSort=function(e){R=e},this.getClearColor=function(e){return e.copy(Fe.getClearColor())},this.setClearColor=function(){Fe.setClearColor(...arguments)},this.getClearAlpha=function(){return Fe.getClearAlpha()},this.setClearAlpha=function(){Fe.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(M!==null){let t=M.texture.format;e=h.has(t)}if(e){let e=M.texture.type,t=g.has(e),n=Fe.getClearColor(),r=Fe.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(_[0]=i,_[1]=a,_[2]=o,_[3]=r,U.clearBufferuiv(U.COLOR,0,_)):(v[0]=i,v[1]=a,v[2]=o,v[3]=r,U.clearBufferiv(U.COLOR,0,v))}else r|=U.COLOR_BUFFER_BIT}t&&(r|=U.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=U.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&U.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),D=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,Ye,!1),t.removeEventListener(`webglcontextrestored`,Ze,!1),t.removeEventListener(`webglcontextcreationerror`,$e,!1),Fe.dispose(),je.dispose(),Me.dispose(),G.dispose(),we.dispose(),De.dispose(),He.dispose(),Ue.dispose(),Oe.dispose(),Ge.dispose(),Ge.removeEventListener(`sessionstart`,st),Ge.removeEventListener(`sessionend`,ct),lt.stop()};function Ye(e){e.preventDefault(),at(`WebGLRenderer: Context Lost.`),E=!0}function Ze(){at(`WebGLRenderer: Context Restored.`),E=!1;let e=Ce.autoReset,t=Pe.enabled,n=Pe.autoUpdate,r=Pe.needsUpdate,i=Pe.type;We(),Ce.autoReset=e,Pe.enabled=t,Pe.autoUpdate=n,Pe.needsUpdate=r,Pe.type=i}function $e(e){zt(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function et(e){let t=e.target;t.removeEventListener(`dispose`,et),tt(t)}function tt(e){nt(e),G.remove(e)}function nt(e){let t=G.get(e).programs;t!==void 0&&(t.forEach(function(e){Oe.releaseProgram(e)}),e.isShaderMaterial&&Oe.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=me);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=xt(e,t,n,r,i);W.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Ee.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;He.setup(i,r,s,n,c);let h,g=Le;if(c!==null&&(h=Te.get(c),g=Re,g.setIndex(h)),i.isMesh)r.wireframe===!0?(W.setLineWidth(r.wireframeLinewidth*ge()),g.setMode(U.LINES)):g.setMode(U.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),W.setLineWidth(e*ge()),i.isLineSegments?g.setMode(U.LINES):i.isLineLoop?g.setMode(U.LINE_LOOP):g.setMode(U.LINE_STRIP)}else i.isPoints?g.setMode(U.POINTS):i.isSprite&&g.setMode(U.TRIANGLES);if(i.isBatchedMesh){if(be.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Te.get(c).bytesPerElement:1,o=G.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(U,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function rt(e,t,n,r){D!==null&&e.isNodeMaterial&&D.setObject(r,e),H===!0&&Ne.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,_t(e,t,r),e.side=0,e.needsUpdate=!0,_t(e,t,r),e.side=2):_t(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),D!==null&&D.renderStart(e,t,n),x=Me.get(n),x.init(t),C.push(x),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),x.setupLights(),D!==null&&D.updateLights(x.state.lightsArray),ue=this.localClippingEnabled,H=Ne.init(this.clippingPlanes,ue),H===!0&&Ne.setGlobalState(this.clippingPlanes,t),D!==null&&Pe.render(x.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];rt(o,n,t,e),r.add(o)}else rt(i,n,t,e),r.add(i)}}),x=C.pop(),D!==null&&D.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){r.forEach(function(e){let t=G.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0?t(e):setTimeout(n,10)}be.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let it=null;function ot(e){it&&it(e)}function st(){lt.stop()}function ct(){lt.start()}let lt=new En;lt.setAnimationLoop(ot),typeof self<`u`&&lt.setContext(self),this.setAnimationLoop=function(e){it=e,Ge.setAnimationLoop(e),e===null?lt.stop():lt.start()},Ge.addEventListener(`sessionstart`,st),Ge.addEventListener(`sessionend`,ct),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){zt(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(E===!0)return;D!==null&&D.renderStart(e,t);let n=Ge.enabled===!0&&Ge.isPresenting===!0,r=w!==null&&(M===null||n)&&w.begin(T,M);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),Ge.enabled===!0&&Ge.isPresenting===!0&&(w===null||w.isCompositing()===!1)&&(Ge.cameraAutoUpdate===!0&&Ge.updateCamera(t),t=Ge.getCamera()),e.isScene===!0&&e.onBeforeRender(T,e,t,M),x=Me.get(e,C.length),x.init(t),x.state.textureUnits=K.getTextureUnits(),C.push(x),de.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),le.setFromProjectionMatrix(de,Qe,t.reversedDepth),ue=this.localClippingEnabled,H=Ne.init(this.clippingPlanes,ue),b=je.get(e,S.length),b.init(),S.push(b),Ge.enabled===!0&&Ge.isPresenting===!0){let e=T.xr.getDepthSensingMesh();e!==null&&dt(e,t,-1/0,T.sortObjects)}dt(e,t,0,T.sortObjects),b.finish(),D!==null&&D.updateLights(x.state.lightsArray),T.sortObjects===!0&&b.sort(oe,R),he=Ge.enabled===!1||Ge.isPresenting===!1||Ge.hasDepthSensing()===!1,he&&Fe.addToRenderList(b,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),H===!0&&Ne.beginShadows();let i=x.state.shadowsArray;if(Pe.render(i,e,t),H===!0&&Ne.endShadows(),(r&&w.hasRenderPass())===!1){let n=b.opaque,r=b.transmissive;if(x.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];pt(n,r,e,a)}he&&Fe.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];ft(b,e,n,n.viewport)}}else r.length>0&&pt(n,r,e,t),he&&Fe.render(e),ft(b,e,t)}M!==null&&j===0&&(K.updateMultisampleRenderTarget(M),K.updateRenderTargetMipmap(M)),r&&w.end(T),e.isScene===!0&&e.onAfterRender(T,e,t),He.resetDefaultState(),N=-1,te=null,C.pop(),C.length>0?(x=C[C.length-1],K.setTextureUnits(x.state.textureUnits),H===!0&&Ne.setGlobalState(T.clippingPlanes,x.state.camera)):x=null,S.pop(),b=S.length>0?S[S.length-1]:null,D!==null&&D.renderEnd()};function dt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)x.pushLightProbeGrid(e);else if(e.isLight)x.pushLight(e),e.castShadow&&x.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||e.intersectsFrustum(le)){r&&pe.setFromMatrixPosition(e.matrixWorld).applyMatrix4(de);let i=De.update(e),a=e.material;a.visible&&b.push(e,i,a,n,pe.z,null,t)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||e.intersectsFrustum(le))){let i=De.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),pe.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),pe.copy(e.boundingSphere.center)),pe.applyMatrix4(e.matrixWorld).applyMatrix4(de)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&b.push(e,i,c,n,pe.z,s,t)}}else a.visible&&b.push(e,i,a,n,pe.z,null,t)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)dt(i[e],t,n,r)}function ft(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;x.setupLightsView(n),H===!0&&Ne.setGlobalState(T.clippingPlanes,n),r&&W.viewport(P.copy(r)),i.length>0&&ht(i,t,n),a.length>0&&ht(a,t,n),o.length>0&&ht(o,t,n),W.buffers.depth.setTest(!0),W.buffers.depth.setMask(!0),W.buffers.color.setMask(!0),W.setPolygonOffset(!1)}function pt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(x.state.transmissionRenderTarget[r.id]===void 0){let e=be.has(`EXT_color_buffer_half_float`)||be.has(`EXT_color_buffer_float`);x.state.transmissionRenderTarget[r.id]=new Xe(1,1,{generateMipmaps:!0,type:e?qe:ze,minFilter:Jt,samples:Math.max(4,xe.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:q.workingColorSpace})}let a=x.state.transmissionRenderTarget[r.id],o=r.viewport||P;a.setSize(o.z*T.transmissionResolutionScale,o.w*T.transmissionResolutionScale);let s=T.getRenderTarget(),c=T.getActiveCubeFace(),l=T.getActiveMipmapLevel();T.setRenderTarget(a),T.getClearColor(re),ie=T.getClearAlpha(),ie<1&&T.setClearColor(16777215,.5),T.clear(),he&&Fe.render(n);let u=T.toneMapping;T.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),x.setupLightsView(r),H===!0&&Ne.setGlobalState(T.clippingPlanes,r),ht(e,n,r),K.updateMultisampleRenderTarget(a),K.updateRenderTargetMipmap(a),be.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,gt(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(K.updateMultisampleRenderTarget(a),K.updateRenderTargetMipmap(a))}T.setRenderTarget(s,c,l),T.setClearColor(re,ie),d!==void 0&&(r.viewport=d),T.toneMapping=u}function ht(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&gt(o,t,n,s,l,c)}}function gt(e,t,n,r,i,a){D!==null&&i.isNodeMaterial&&D.setObject(e,i),e.onBeforeRender(T,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(T,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=2):T.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(T,t,n,r,i,a)}function _t(e,t,n){t.isScene!==!0&&(t=me);let r=G.get(e),i=x.state.lights,a=x.state.shadowsArray,o=i.state.version,s=Oe.getParameters(e,i.state,a,t,n,x.state.lightProbeGridArray),c=Oe.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=we.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,et),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return yt(e,s),d}else s.uniforms=Oe.getUniforms(e),D!==null&&e.isNodeMaterial&&D.build(e,n,s),e.onBeforeCompile(s,T),d=Oe.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Ne.uniform),yt(e,s),r.needsLights=Ct(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=x.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function vt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=bi.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function yt(e,t){let n=G.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function bt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];y.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(y))return n}return null}function xt(e,t,n,r,i){t.isScene!==!0&&(t=me),K.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=M===null?T.outputColorSpace:M.isXRRenderTarget===!0?M.texture.colorSpace:q.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=we.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(M===null||M.isXRRenderTarget===!0)&&(h=T.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=G.get(r),y=x.state.lights;if(H===!0&&(ue===!0||e!==te)){let t=e===te&&r.id===N;Ne.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Ne.numPlanes||v.numIntersection!==Ne.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=x.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let S=v.currentProgram;b===!0&&(S=_t(r,t,i),D&&r.isNodeMaterial&&D.onUpdateProgram(r,S,v));let C=!1,w=!1,E=!1,O=S.getUniforms(),k=v.uniforms;if(W.useProgram(S.program)&&(C=!0,w=!0,E=!0),r.id!==N&&(N=r.id,w=!0),v.needsLights){let e=bt(x.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,w=!0)}if(C||te!==e){W.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),O.setValue(U,`projectionMatrix`,e.projectionMatrix),O.setValue(U,`viewMatrix`,e.matrixWorldInverse);let t=O.map.cameraPosition;t!==void 0&&t.setValue(U,fe.setFromMatrixPosition(e.matrixWorld)),xe.logarithmicDepthBuffer&&O.setValue(U,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&O.setValue(U,`isOrthographic`,e.isOrthographicCamera===!0),te!==e&&(te=e,w=!0,E=!0)}if(v.needsLights&&(y.state.sunShadowMap.length>0&&O.setValue(U,`sunShadowMap`,y.state.sunShadowMap,K),y.state.directionalShadowMap.length>0&&O.setValue(U,`directionalShadowMap`,y.state.directionalShadowMap,K),y.state.spotShadowMap.length>0&&O.setValue(U,`spotShadowMap`,y.state.spotShadowMap,K),y.state.pointShadowMap.length>0&&O.setValue(U,`pointShadowMap`,y.state.pointShadowMap,K)),i.isSkinnedMesh){O.setOptional(U,i,`bindMatrix`),O.setOptional(U,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),O.setValue(U,`boneTexture`,e.boneTexture,K))}i.isBatchedMesh&&(O.setOptional(U,i,`batchingTexture`),O.setValue(U,`batchingTexture`,i._matricesTexture,K),O.setOptional(U,i,`batchingIdTexture`),O.setValue(U,`batchingIdTexture`,i._indirectTexture,K),O.setOptional(U,i,`batchingColorTexture`),i._colorsTexture!==null&&O.setValue(U,`batchingColorTexture`,i._colorsTexture,K));let ee=n.morphAttributes;if((ee.position!==void 0||ee.normal!==void 0||ee.color!==void 0)&&Ie.update(i,n,S),(w||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,O.setValue(U,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(k.envMapIntensity.value=t.environmentIntensity),k.dfgLUT!==void 0&&(k.dfgLUT.value=Va()),w){if(O.setValue(U,`toneMappingExposure`,T.toneMappingExposure),v.needsLights&&St(k,E),a&&r.fog===!0&&ke.refreshFogUniforms(k,a),ke.refreshMaterialUniforms(k,r,L,ae,x.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;k.probesSH.value=e.texture,k.probesMin.value.copy(e.boundingBox.min),k.probesMax.value.copy(e.boundingBox.max),k.probesResolution.value.copy(e.resolution)}bi.upload(U,vt(v),k,K)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(bi.upload(U,vt(v),k,K),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&O.setValue(U,`center`,i.center),O.setValue(U,`modelViewMatrix`,i.modelViewMatrix),O.setValue(U,`normalMatrix`,i.normalMatrix),O.setValue(U,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];Ue.update(n,S),Ue.bind(n,S)}}return S}function St(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Ct(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return A},this.getActiveMipmapLevel=function(){return j},this.getRenderTarget=function(){return M},this.setRenderTargetTextures=function(e,t,n){let r=G.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),G.get(e.texture).__webglTexture=t,G.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=G.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){M=e,A=t,j=n;let r=null,i=!1,a=!1;if(e){let o=G.get(e);if(o.__useDefaultFramebuffer!==void 0){W.bindFramebuffer(U.FRAMEBUFFER,o.__webglFramebuffer),P.copy(e.viewport),F.copy(e.scissor),ne=e.scissorTest,W.viewport(P),W.scissor(F),W.setScissorTest(ne),N=-1;return}if(o.__webglFramebuffer===void 0)K.setupRenderTarget(e);else if(o.__hasExternalTextures)K.rebindTextures(e,G.get(e.texture).__webglTexture,G.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&G.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);K.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=G.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&K.useMultisampledRTT(e)===!1?G.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,P.copy(e.viewport),F.copy(e.scissor),ne=e.scissorTest}else P.copy(se).multiplyScalar(L).floor(),F.copy(z).multiplyScalar(L).floor(),ne=ce;if(n!==0&&(r=O),W.bindFramebuffer(U.FRAMEBUFFER,r)&&W.drawBuffers(e,r),W.viewport(P),W.scissor(F),W.setScissorTest(ne),i){let r=G.get(e.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=G.get(e.textures[t]);U.framebufferTextureLayer(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=G.get(e.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,t.__webglTexture,n)}N=-1};function wt(e){let t=G.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=xe.textureFormatReadable(e.format),t.__typeReadable=xe.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){zt(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=G.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){W.bindFramebuffer(U.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+s);let u=wt(o);if(u.__formatReadable===!1){zt(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){zt(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&U.readPixels(t,n,r,i,Ve.convert(c),Ve.convert(l),a)}finally{let e=M===null?null:G.get(M).__webglFramebuffer;W.bindFramebuffer(U.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=G.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){W.bindFramebuffer(U.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+s);let d=wt(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=U.createBuffer();U.bindBuffer(U.PIXEL_PACK_BUFFER,f),U.bufferData(U.PIXEL_PACK_BUFFER,a.byteLength,U.STREAM_READ),U.readPixels(t,n,r,i,Ve.convert(l),Ve.convert(u),0),U.bindBuffer(U.PIXEL_PACK_BUFFER,null);let p=M===null?null:G.get(M).__webglFramebuffer;W.bindFramebuffer(U.FRAMEBUFFER,p);let m=U.fenceSync(U.SYNC_GPU_COMMANDS_COMPLETE,0);return U.flush(),await Xt(U,m,4),U.bindBuffer(U.PIXEL_PACK_BUFFER,f),U.getBufferSubData(U.PIXEL_PACK_BUFFER,0,a),U.bindBuffer(U.PIXEL_PACK_BUFFER,null),U.deleteBuffer(f),U.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;K.setTexture2D(e,0),U.copyTexSubImage2D(U.TEXTURE_2D,n,0,0,o,s,i,a),W.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=Ve.convert(t.format),_=Ve.convert(t.type),v;t.isData3DTexture?(K.setTexture3D(t,0),v=U.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(K.setTexture2DArray(t,0),v=U.TEXTURE_2D_ARRAY):(K.setTexture2D(t,0),v=U.TEXTURE_2D),W.activeTexture(U.TEXTURE0),W.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,t.flipY),W.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),W.pixelStorei(U.UNPACK_ALIGNMENT,t.unpackAlignment);let y=W.getParameter(U.UNPACK_ROW_LENGTH),b=W.getParameter(U.UNPACK_IMAGE_HEIGHT),x=W.getParameter(U.UNPACK_SKIP_PIXELS),S=W.getParameter(U.UNPACK_SKIP_ROWS),C=W.getParameter(U.UNPACK_SKIP_IMAGES);W.pixelStorei(U.UNPACK_ROW_LENGTH,h.width),W.pixelStorei(U.UNPACK_IMAGE_HEIGHT,h.height),W.pixelStorei(U.UNPACK_SKIP_PIXELS,l),W.pixelStorei(U.UNPACK_SKIP_ROWS,u),W.pixelStorei(U.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=G.get(e),r=G.get(t),h=G.get(n.__renderTarget),g=G.get(r.__renderTarget);W.bindFramebuffer(U.READ_FRAMEBUFFER,h.__webglFramebuffer),W.bindFramebuffer(U.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,G.get(e).__webglTexture,i,d+n),U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,G.get(t).__webglTexture,a,m+n)),U.blitFramebuffer(l,u,o,s,f,p,o,s,U.DEPTH_BUFFER_BIT,U.NEAREST);W.bindFramebuffer(U.READ_FRAMEBUFFER,null),W.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||G.has(e)){let n=G.get(e),r=G.get(t);W.bindFramebuffer(U.READ_FRAMEBUFFER,k),W.bindFramebuffer(U.DRAW_FRAMEBUFFER,ee);for(let e=0;e<c;e++)w?U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):U.framebufferTexture2D(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,n.__webglTexture,i),T?U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):U.framebufferTexture2D(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,r.__webglTexture,a),i===0?T?U.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):U.copyTexSubImage2D(v,a,f,p,l,u,o,s):U.blitFramebuffer(l,u,o,s,f,p,o,s,U.COLOR_BUFFER_BIT,U.NEAREST);W.bindFramebuffer(U.READ_FRAMEBUFFER,null),W.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?U.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?U.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):U.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?U.texSubImage2D(U.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?U.compressedTexSubImage2D(U.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):U.texSubImage2D(U.TEXTURE_2D,a,f,p,o,s,g,_,h);W.pixelStorei(U.UNPACK_ROW_LENGTH,y),W.pixelStorei(U.UNPACK_IMAGE_HEIGHT,b),W.pixelStorei(U.UNPACK_SKIP_PIXELS,x),W.pixelStorei(U.UNPACK_SKIP_ROWS,S),W.pixelStorei(U.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&U.generateMipmap(v),W.unbindTexture()},this.initRenderTarget=function(e){G.get(e).__webglFramebuffer===void 0&&K.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?K.setTextureCube(e,0):e.isData3DTexture?K.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?K.setTexture2DArray(e,0):K.setTexture2D(e,0),W.unbindTexture()},this.resetState=function(){A=0,j=0,M=null,W.reset(),He.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return Qe}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=q._getDrawingBufferColorSpace(e),t.unpackColorSpace=q._getUnpackColorSpace()}},Ua={PGC:`Galaktyki PGC`,QSO:`Kwazary`,ACO:`Gromady galaktyk ACO`};function Wa(t,n){let r=new Map(t.map(e=>[e.id,e])),i=!1;for(let t of n){let n=r.get(t.id);if(!n)r.set(t.id,t),i=!0;else if(t.catalogMatch&&(!n.catalogMatch||!n.catalogMatch.distance&&t.catalogMatch.distance)){let a=t.catalogMatch.distance,o=a&&n.distLy===null&&n.distanceOrigin!==`user`?e(a,`catalog`):void 0;r.set(n.id,{...n,...o,catalogMatch:t.catalogMatch}),i=!0}}return i?[...r.values()]:t}function Ga(e){let t=!e.distLy||e.distanceSource===`Wikidata — katalog aplikacji`||!e.distanceSource;return{...e,distanceScope:e.distanceScope===`complex`?`population`:`object`,distanceMethod:t&&e.distLy?`Wikidata, niezweryfikowane`:``,distanceSource:t&&e.distLy?`Wikidata (P2583)`:e.distLy?e.distanceSource:``,distanceRef:``,distanceOrigin:t?`catalog`:`user`}}function Ka(e){if(!e||typeof e!=`object`)return null;let t=e,n=t.version!==1&&t.stars&&Array.isArray(t.stars.stars)?t.stars:null;return t.version===1||t.version===2?{...t,version:3,stars:n,cuts:t.cuts.map(Ga)}:t.version===3?{...t,version:3,stars:n,cuts:t.cuts}:null}function qa(e){return e.distLy?[`≈ ${I(e.distLy)}${e.uncertaintyLy?` ± ${I(e.uncertaintyLy)}`:``}`,e.distanceScope===`object`?``:y[e.distanceScope],e.distanceMethod,e.distanceSource].filter(Boolean).join(` · `):`bez ustalonej odległości`}function Ja(e){return e.filter(e=>e.enabled&&p(e))}function Ya(e,t,n){let r=Math.min(e.radius*2,t,n);return{x:Math.max(0,Math.min(e.x-r/2,t-r)),y:Math.max(0,Math.min(e.y-r/2,n-r)),side:r}}function Xa(e,t){return e===null||!Number.isFinite(e)||e<=0?`direction`:t===`galaxy`&&e>=15e4?`outside`:t===`universe`&&e<15e4?`local`:`position`}function Za(e){return e.map((t,n)=>e.some((e,r)=>r>n&&(t.x-e.x)**2+(t.y-e.y)**2<(t.radius+e.radius)**2))}function Qa(e,t,n,r={top:65,bottom:105,side:18}){let i=t-r.top-r.bottom,a=Math.min((e-2*r.side)/n.width,Math.max(80,i)/n.height);return{x:(e-n.width*a)/2,y:r.top+(i-n.height*a)/2,scale:a}}var $a=2e3,eo={all:`Wszystko`,stars:`Gwiazdy`,nebulae:`Mgławice i gromady`,galaxies:`Galaktyki`},to=`Gaia DR3; odległość: Bailer-Jones i in. 2021 (geometryczna)`;function no(e){return e===`G`||e===`GG`?`galaxies`:`nebulae`}function ro(e){let t=Ja(e.cuts).map(e=>({id:e.id,kind:`object`,category:no(e.type),type:e.type,catalogKind:e.catalogMatch?.kind,x:e.x,y:e.y,radius:e.radius,distLy:e.distLy,distLoLy:e.distLy!==null&&e.uncertaintyLy!==null?e.distLy-e.uncertaintyLy:null,distHiLy:e.distLy!==null&&e.uncertaintyLy!==null?e.distLy+e.uncertaintyLy:null,gMag:null,bpRp:null,parallaxOverError:null,raDeg:e.raDeg,decDeg:e.decDeg,source:e.distanceSource,method:e.distanceMethod,ref:e.distanceRef,scope:e.distanceScope})),n=(e.stars?.stars??[]).filter(e=>e.distLy!==null&&e.distLy>0).map(e=>({id:e.id,kind:`star`,category:`stars`,type:null,x:e.x,y:e.y,radius:0,distLy:e.distLy,distLoLy:e.distLoLy,distHiLy:e.distHiLy,gMag:e.gMag,bpRp:e.bpRp,parallaxOverError:e.parallaxOverError,raDeg:e.raDeg,decDeg:e.decDeg,source:to,method:`paralaksa Gaia DR3 (ϖ/σ ≥ 5)`,ref:`2021AJ....161..147B`,scope:`object`}));return[...t,...n]}function io(e){let t=e.filter(e=>e!==null&&Number.isFinite(e)&&e>0);if(!t.length)return{minLy:10,maxLy:1e4};let n=Math.floor(Math.log10(Math.min(...t))),r=Math.max(n+1,Math.ceil(Math.log10(Math.max(...t))));return{minLy:10**n,maxLy:10**r}}function ao(e,t){let n=(Math.log10(e)-Math.log10(t.minLy))/(Math.log10(t.maxLy)-Math.log10(t.minLy));return Math.max(0,Math.min(1,n))}function oo(e,t){return 10**(Math.log10(t.minLy)+Math.max(0,Math.min(1,e))*(Math.log10(t.maxLy)-Math.log10(t.minLy)))}var so=e=>{let t=Math.max(0,Math.min(1,e));return t*t*(3-2*t)};function co(e,t,n,r,i){let a=100/t.width;return[(e.x-t.width/2)*a,(t.height/2-e.y)*a,-(n!==null&&n>0?ao(n,r)*400:0)*so(i)]}function lo(e,t,n){let r=([e,t,n])=>{let r=Math.hypot(e,t,n);return{r,phi:r?Math.acos(Math.max(-1,Math.min(1,t/r))):0,theta:Math.atan2(e,n)}},i=r(e),a=r(t),o=((a.theta-i.theta)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI,s=i.r+(a.r-i.r)*n,c=i.phi+(a.phi-i.phi)*n,l=i.theta+o*n;return[s*Math.sin(c)*Math.sin(l),s*Math.cos(c),s*Math.sin(c)*Math.cos(l)]}function uo(e,t,n=48){let r=Array(n).fill(0);for(let i of e)i===null||!(i>0)||i<t.minLy||i>t.maxLy||r[Math.min(n-1,Math.floor(ao(i,t)*n))]++;return{edges:Array.from({length:n+1},(e,r)=>oo(r/n,t)),counts:r}}function fo(e,t){return t.category!==`all`&&e.category!==t.category?!1:!t.range||e.distLy!==null&&e.distLy>=t.range[0]&&e.distLy<=t.range[1]}function po(e){let t={all:e.length,stars:0,nebulae:0,galaxies:0};for(let n of e)t[n.category]++;return t}function mo(e,t){return e.distLy===null||t.distLy===null?e.distLy===t.distLy?(e.gMag??-99)-(t.gMag??-99):e.distLy===null?1:-1:e.distLy-t.distLy}function ho(e){let t=[[-.3,[.62,.72,1]],[.3,[.85,.9,1]],[.8,[1,.96,.88]],[1.3,[1,.85,.62]],[2.2,[1,.66,.42]],[3.5,[1,.5,.35]]],n=e??.8;if(n<=t[0][0])return t[0][1];for(let e=1;e<t.length;e++){let[r,i]=t[e];if(n<=r){let[a,o]=t[e-1],s=(n-a)/(r-a);return[o[0]+(i[0]-o[0])*s,o[1]+(i[1]-o[1])*s,o[2]+(i[2]-o[2])*s]}}return t[t.length-1][1]}function go(e,t){let n=Math.max(0,t-(e??t));return Math.min(9,1.5+n*.9)}var _o=.518;function vo(e,t,n){let r=e?.cd;if(!Array.isArray(r)||r.length!==2||r.some(e=>!Array.isArray(e)||e.length!==2||e.some(e=>!Number.isFinite(e))))return null;let i=Math.sqrt(Math.abs(r[0][0]*r[1][1]-r[0][1]*r[1][0]));if(!(i>0))return null;let a=t*i,o=n*i;return{widthDeg:a,heightDeg:o,moons:Math.max(a,o)/_o}}function yo(e,t,n){let r=40*Math.PI/360,i=Math.atan(Math.tan(r)*n);return Math.max(t/2/Math.tan(r),e/2/Math.tan(i))*1.12}function bo(e,t){let n=100*e.height/e.width,r=Math.max(85,yo(100,Math.min(n,100),t)*.96),i=Math.max(r,n/2),a=Math.min(.14*(r-70)*(r/70),.22*r),o=40;if(n>100){let e=Math.hypot(a,i),r=n/2,s=e-r*a/e,c=Math.max(r*i/e,100/(2*t));o=Math.max(o,Math.atan(c/(.96*s))*360/Math.PI)}return{target:[0,0,0],position:[0,a,i],fov:o}}function xo(e,t,n){let r=100*t.height/t.width,i=[-50,-r/2,0],a=[50,r/2,70];for(let r of e){if(r.distLy===null)continue;let e=co(r,t,r.distLy,n,1);for(let t=0;t<3;t++)i[t]=Math.min(i[t],e[t]),a[t]=Math.max(a[t],e[t])}let o=[(i[0]+a[0])/2,(i[1]+a[1])/2,(i[2]+a[2])/2],s=Math.hypot(a[0]-i[0],a[1]-i[1],a[2]-i[2])/2/Math.sin(40*Math.PI/360)*.9,c=[1.05,.62,.9],l=Math.hypot(...c);return{target:o,position:[o[0]+c[0]/l*s,o[1]+c[1]/l*s,o[2]+c[2]/l*s]}}var So=Math.PI/180,Co=32*So,wo=20*So,To=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],Eo=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],Do=e=>{let t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]},Oo=(e,t,n,r)=>[e[0]*t+n[0]*r,e[1]*t+n[1]*r,e[2]*t+n[2]*r],ko=2e4;function Ao(e,t,n){if(!e.length)return null;let r=e.map(e=>Do(Oo(e,1,t,-1))),i=Do(r.reduce((e,t)=>Oo(e,1,t,1),[0,0,0])),a=Eo(i,[0,1,0]),o=Math.hypot(...a)>1e-6?Do(a):[1,0,0],s=Eo(o,i),c=0;for(let e of r){let t=To(e,i);if(t<=0)return null;c=Math.max(c,Math.abs(To(e,s))/t,Math.abs(To(e,o))/(t*n))}let l=e.reduce((e,n)=>e+Math.hypot(...Oo(n,1,t,-1)),0)/e.length,u=Math.max(.02,l*.5);return{position:Oo(t,1,i,-u),target:Oo(t,1,i,l),forward:i,fov:Math.max(5,2*Math.atan(c*l/((l+u)*.8))/So),project(e){let n=Oo(e,1,t,-1),r=To(n,i);return r>0?Oo(t,1,n,l/r):e}}}function jo(e,t=[.55,0,.75]){let n=Do(e),r=Math.hypot(n[0],n[2]),i=Math.hypot(t[0],t[2])>1e-6?Do([t[0],0,t[2]]):[.59,0,.81],a=r>1e-6?[-n[2]/r,0,n[0]/r]:i;To(a,i)<0&&(a=[-a[0],0,-a[2]]);let o=Eo(n,a);o[1]<0&&(o=[-o[0],-o[1],-o[2]]);let s=Do(Oo(a,Math.cos(Co),o,Math.sin(Co)));if(s[1]>=Math.sin(wo))return s;let c=Do([s[0],0,s[2]]);return[c[0]*Math.cos(wo),Math.sin(wo),c[2]*Math.cos(wo)]}function Mo(e,t,n,{fovDeg:r,aspect:i,room:a=[.8,.8],minDistance:o=0}){let s=Do(n),c=Eo([0,1,0],s),l=Math.hypot(...c)>1e-6?Do(c):[1,0,0],u=Eo(s,l),d=Math.tan(r*So/2),f=o;for(let n of e){let e=[n[0]-t[0],n[1]-t[1],n[2]-t[2]],r=To(e,s);f=Math.max(f,r+Math.abs(To(e,u))/(d*a[1]),r+Math.abs(To(e,l))/(d*i*a[0]))}return f}function No(e,t,n){let r=[0,1,2].map(t=>{let n=e.map(e=>e[t]);return(Math.min(...n)+Math.max(...n))/2}),i=Do(t),a=Mo(e,r,i,n);return{target:r,position:[r[0]+i[0]*a,r[1]+i[1]*a,r[2]+i[2]*a]}}var Po={in:{dive:4250,enter:$a},out:{dive:3400,enter:$a}},Fo=e=>Po[e].dive+Po[e].enter,Io=e=>Math.max(0,Math.min(1,e)),Lo=e=>{let t=Io(e);return t<.5?4*t*t*t:1-(-2*t+2)**3/2},Ro=(e,t,n)=>{let r=Io((e-t)/(n-t));return r*r*(3-2*r)};function zo(e,t){let{dive:n,enter:r}=Po[t],i=Io(e/(n+r)),a=t===`in`?i:1-i,o=a*(n+r);if(o<n){let e=o/n;return{s:a,phase:`dive`,k:e,e:Ro(e,0,1),photoProgress:0,done:i>=1}}let s=Math.min(1,(o-n)/r);return{s:a,phase:`enter`,k:s,e:1,photoProgress:s,done:i>=1}}function Bo(e,t){return e}function Vo(e,t,n){if(t===n)return Math.max(0,Math.min(Fo(n),e));let r=zo(e,t),i=Po[n],a=r.phase===`dive`?r.k*i.dive:i.dive+r.k*i.enter,o=i.dive+i.enter;return n===`out`?o-a:a}function Ho(e,t,n){return t**(1-e)*n**e}function Uo(e,t){let n=e.x.reduce((e,n,r)=>e+n*t[r],0),r=e.y.reduce((e,n,r)=>e+n*t[r],0);return Math.hypot(n,r)<1e-6?0:Math.atan2(-n,r)}function Wo(e,t,n,r=0){let i=Math.cos(r),a=Math.sin(r);return{origin:e,x:t.x.map((e,n)=>e*i+t.y[n]*a),y:t.y.map((e,n)=>e*i-t.x[n]*a),z:[-t.center[0],-t.center[1],-t.center[2]],earth:n}}function Go(e,t){return[0,1,2].map(n=>e.x[n]*t[0]+e.y[n]*t[1]+e.z[n]*t[2])}function Ko(e,t,n){let r=Go(e,[t[0]-e.earth[0],t[1]-e.earth[1],t[2]-e.earth[2]]);return[e.origin[0]+r[0]*n,e.origin[1]+r[1]*n,e.origin[2]+r[2]*n]}function qo(e,t,n){let r=Jo(e,[(t[0]-e.origin[0])/n,(t[1]-e.origin[1])/n,(t[2]-e.origin[2])/n]);return[e.earth[0]+r[0],e.earth[1]+r[1],e.earth[2]+r[2]]}function Jo(e,t){let n=e=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2];return[n(e.x),n(e.y),n(e.z)]}function Yo(e,t,n){return{position:Ko(e,t.position,n),target:Ko(e,t.target,n),up:Go(e,t.up)}}var Xo=e=>{let t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]};function Zo(e,t,n){let r=Xo(e),i=Xo(t),a=Math.max(-1,Math.min(1,r[0]*i[0]+r[1]*i[1]+r[2]*i[2])),o=Math.acos(a);if(o<1e-6)return i;if(Math.PI-o<1e-6){let e=Xo(Math.abs(r[0])<.9?[0,-r[2],r[1]]:[-r[2],0,r[0]]),t=Math.cos(Math.PI*n),i=Math.sin(Math.PI*n);return Xo([r[0]*t+e[0]*i,r[1]*t+e[1]*i,r[2]*t+e[2]*i])}let s=Math.sin(o),c=Math.sin((1-n)*o)/s,l=Math.sin(n*o)/s;return Xo([r[0]*c+i[0]*l,r[1]*c+i[1]*l,r[2]*c+i[2]*l])}function Qo(e,t,n,r){let i=Math.hypot(e.position[0]-t.origin[0],e.position[1]-t.origin[1],e.position[2]-t.origin[2]),a=Math.hypot(n.position[0]-t.earth[0],n.position[1]-t.earth[1],n.position[2]-t.earth[2]);return Math.max(r,i/a)}var $o=.6,es=.34,ts=e=>Ro(e,.15,.53);function ns(e,t,n,{e:r,k:i},a,o){let s=Ho(r,a,o),c=s/a,l=t.origin,u=(e,t)=>[(e[0]-l[0])*t,(e[1]-l[1])*t,(e[2]-l[2])*t],d=Yo(t,n,s),f=ts(i),p=u(e.position,c),m=u(d.position,1),h=Math.hypot(...p),g=h+(Math.hypot(...m)-h)*f,_=Zo(p,m,f).map(e=>e*g),v=u(e.target,c),y=u(d.target,1);return{position:[l[0]+_[0],l[1]+_[1],l[2]+_[2]],target:[0,1,2].map(e=>l[e]+v[e]+(y[e]-v[e])*f),up:Zo(e.up,d.up,f)}}function rs(e,t,n){let r=[0,1,2].map(r=>e.target[r]+(t.target[r]-e.target[r])*n),i=lo([e.position[0]-e.target[0],e.position[1]-e.target[1],e.position[2]-e.target[2]],[t.position[0]-t.target[0],t.position[1]-t.target[1],t.position[2]-t.target[2]],n);return{target:r,position:[r[0]+i[0],r[1]+i[1],r[2]+i[2]],up:Zo(e.up,t.up,n)}}function is(e,t,n){let r=rs(e,t,n),i=e=>Math.hypot(e.position[0]-e.target[0],e.position[1]-e.target[1],e.position[2]-e.target[2]),a=i(e),o=i(t),s=i(r);if(!(a>0&&o>0&&s>0))return r;let c=a**(1-n)*o**n/s;return{...r,position:r.position.map((e,t)=>r.target[t]+(e-r.target[t])*c)}}var as=e=>Ro(e,es,$o),os=e=>1+8*(1-as(e)),ss=e=>Ro(e,.15,es);function cs(e,t,n,r,i,a){let o=as(r);return Ko(e,n,a).map((n,r)=>{let s=e.origin[r]+(t[r]-e.origin[r])*(a/i);return s+(n-s)*o})}function ls(e,t,n){let r=as(e);return[Math.exp(Math.log(t[0])*(1-r)+Math.log(n[0])*r),Math.exp(Math.log(t[1])*(1-r)+Math.log(n[1])*r)]}function us(e,t,n,r=n){return Ho(as(e),n/r*t,70*n)}function ds(e){let t=$o,n=Ro(e,t,.85),r=Ro(e,t,.83),i=Ro(e,.64,.94);return{layers:1-Ro(e,.3,.68),labels:1-Ro(e,0,.33),guide:1-i,spaceAxis:1-r,cone:1-n,coneFaces:1-Ro(e,es,t),spaceEarth:1-Ro(e,.7,.9299999999999999),earth:Ro(e,t,.83),pyramid:n,axis:r,photo:i,grid:Ro(e,es,.54)}}function fs(e){let t=Math.min(.1,Math.max(1e-5,e*.01));return{near:t,far:Math.min(ko,Math.max(300,t*1e6))}}var ps=1e3;function ms({histogram:e,domain:t,range:n,onRange:r,marker:i}){let a=(0,X.useRef)(null),[o,s]=(0,X.useState)(null),c=Math.max(1,...e.counts),l=e.counts.length,[u,d]=n?[ao(n[0],t),ao(n[1],t)]:[0,1],f=e=>{let t=a.current.getBoundingClientRect();return Math.max(0,Math.min(1,(e-t.left)/t.width))},p=(e,n)=>r([oo(Math.min(e,n),t),oo(Math.max(e,n),t)]);return(0,Z.jsxs)(`div`,{className:`obs-histogram`,children:[(0,Z.jsxs)(`div`,{className:`obs-histogram-head`,children:[(0,Z.jsx)(`span`,{className:`label`,children:`Rozkład odległości`}),(0,Z.jsx)(`span`,{className:`faint`,children:n?`${I(n[0])} – ${I(n[1])} · dwuklik: cały zakres`:`bliżej → dalej · przeciągnij, aby wybrać przedział`})]}),(0,Z.jsxs)(`svg`,{ref:a,viewBox:`0 0 ${l} 40`,preserveAspectRatio:`none`,"aria-hidden":`true`,onPointerDown:e=>{e.currentTarget.setPointerCapture(e.pointerId),s(f(e.clientX))},onPointerMove:e=>{o!==null&&Math.abs(f(e.clientX)-o)>.005&&p(o,f(e.clientX))},onPointerUp:()=>s(null),onPointerCancel:()=>s(null),onDoubleClick:()=>r(null),children:[e.counts.map((e,t)=>e>0&&(0,Z.jsx)(`rect`,{className:(t+.5)/l>=u&&(t+.5)/l<=d?`on`:``,x:t+.12,width:.76,y:40-Math.max(3,e/c*36),height:Math.max(3,e/c*36)},t)),i!==null&&(0,Z.jsx)(`line`,{className:`obs-histogram-marker`,x1:ao(i,t)*l,x2:ao(i,t)*l,y1:0,y2:40})]}),(0,Z.jsxs)(`div`,{className:`obs-histogram-scale figures`,children:[(0,Z.jsx)(`span`,{children:I(t.minLy)}),(0,Z.jsx)(`span`,{children:I(t.maxLy)})]}),(0,Z.jsxs)(`div`,{className:`obs-range-inputs`,children:[(0,Z.jsx)(`input`,{type:`range`,min:0,max:ps,value:Math.round(u*ps),"aria-label":`Zakres odległości: od`,"aria-valuetext":I(oo(u,t)),onChange:e=>p(Math.min(Number(e.target.value)/ps,d),d)}),(0,Z.jsx)(`input`,{type:`range`,min:0,max:ps,value:Math.round(d*ps),"aria-label":`Zakres odległości: do`,"aria-valuetext":I(oo(d,t)),onChange:e=>p(u,Math.max(Number(e.target.value)/ps,u))})]})]})}var hs=[`stars`,`nebulae`,`galaxies`],gs=e=>e.kind===`star`?`Gwiazda`:e.catalogKind===`QSO`?`Kwazar`:e.catalogKind===`ACO`?`Gromada galaktyk`:e.type?c[e.type].label:`Obiekt`;function _s(e){let t=e.distLoLy!==null&&e.distHiLy!==null&&e.distLy!==null?(e.distHiLy-e.distLoLy)/2:null,n=`≈ ${I(e.distLy)}${t?` ± ${I(t)}`:``}`;return e.kind===`star`?[n,e.parallaxOverError===null?``:`ϖ/σ = ${ae(e.parallaxOverError,1)}`,e.source].filter(Boolean).join(` · `):[n,`zakres: ${y[e.scope]}`,e.method,e.source].filter(Boolean).join(` · `)}function vs({items:e,revealStars:t,selected:n,onSelect:r,descending:i,onSort:a}){let o=D(e=>e.annotationColors),[s,c]=(0,X.useState)([`stars`]),[l,u]=(0,X.useState)([]),f=t?l:s,p=t?u:c,m=(0,X.useMemo)(()=>hs.flatMap(t=>{let n=e.filter(e=>e.category===t);if(n.length===0)return[];let r=!f.includes(t);return[{category:t,count:n.length,expanded:r},...r?n.map(e=>({item:e})):[]]}),[e,f]),h=(0,X.useRef)(null),g=pn({count:m.length,getScrollElement:()=>h.current,estimateSize:()=>36,overscan:8}),_=g.getVirtualItems(),v=m.findIndex(e=>`item`in e&&e.item.id===n),y=(0,X.useEffectEvent)(()=>{v>=0&&g.scrollToIndex(v,{align:`auto`})});return(0,X.useEffect)(()=>{y()},[e,n]),(0,Z.jsxs)(`div`,{className:`obs-list`,children:[(0,Z.jsxs)(`div`,{className:`obs-list-head label`,children:[(0,Z.jsx)(`span`,{children:`Obiekt`}),(0,Z.jsxs)(`button`,{type:`button`,onClick:a,"aria-label":`Sortuj według odległości ${i?`rosnąco`:`malejąco`}`,children:[`Od Ziemi · `,i?`malejąco`:`rosnąco`]})]}),(0,Z.jsx)(`div`,{ref:h,className:`obs-list-scroll`,role:`grid`,"aria-label":`Obiekty zdjęcia według grup i odległości`,"aria-rowcount":m.length,"aria-colcount":2,"aria-activedescendant":_.some(e=>e.index===v)?`obs-row-${v}`:void 0,tabIndex:0,onKeyDown:e=>{if(e.target!==e.currentTarget||e.key!==`ArrowDown`&&e.key!==`ArrowUp`)return;e.preventDefault();let t=v<0||e.key===`ArrowDown`?1:-1,n=v+t;for(;m[n]&&`category`in m[n];)n+=t;let i=m[n];i&&`item`in i&&r(i.item.id)},children:(0,Z.jsx)(`div`,{role:`presentation`,style:{height:g.getTotalSize(),position:`relative`},children:_.map(e=>{let t=m[e.index],i={transform:`translateY(${e.start}px)`,height:e.size};if(`category`in t){let{category:n,count:r,expanded:a}=t;return(0,Z.jsx)(`div`,{role:`row`,"aria-rowindex":e.index+1,className:`obs-row obs-list-group`,style:i,children:(0,Z.jsx)(`div`,{role:`gridcell`,"aria-colspan":2,children:(0,Z.jsxs)(`button`,{type:`button`,"aria-expanded":a,onClick:()=>p(e=>e.includes(n)?e.filter(e=>e!==n):[...e,n]),children:[(0,Z.jsx)(gn,{"aria-hidden":`true`,size:14}),eo[n],(0,Z.jsx)(`span`,{className:`figures dim`,children:r})]})})},n)}let{item:a}=t;return(0,Z.jsxs)(`div`,{id:`obs-row-${e.index}`,role:`row`,"aria-rowindex":e.index+1,"aria-selected":a.id===n,className:`obs-row${a.id===n?` on`:``}`,style:i,title:_s(a),onClick:()=>r(a.id),children:[(0,Z.jsx)(`span`,{className:`obs-marker ${a.category}`,style:a.type?{color:o[a.type]??d[a.type]}:void 0,"aria-hidden":`true`}),(0,Z.jsxs)(`span`,{className:`obs-row-name`,role:`gridcell`,children:[(0,Z.jsx)(`span`,{children:a.kind===`star`?a.id.replace(`Gaia DR3 `,`Gaia `):a.id}),(0,Z.jsx)(`small`,{children:gs(a)})]}),(0,Z.jsx)(`span`,{className:`obs-row-dist figures`,role:`gridcell`,children:I(a.distLy)})]},a.id)})})})]})}var ys={type:`change`},bs={type:`start`},xs={type:`end`},Ss=new _t,Cs=new Ve,ws=Math.cos(70*dt.DEG2RAD),Ts=new Y,Es=2*Math.PI,Ds={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Os=1e-6,ks=class extends le{constructor(e,t=null){super(e,t),this.state=Ds.NONE,this.target=new Y,this.cursor=new Y,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:`ArrowLeft`,UP:`ArrowUp`,RIGHT:`ArrowRight`,BOTTOM:`ArrowDown`},this.mouseButtons={LEFT:Zt.ROTATE,MIDDLE:Zt.DOLLY,RIGHT:Zt.PAN},this.touches={ONE:Ee.ROTATE,TWO:Ee.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle=`auto`,this._domElementKeyEvents=null,this._lastPosition=new Y,this._lastQuaternion=new me,this._lastTargetPosition=new Y,this._quat=new me().setFromUnitVectors(e.up,new Y(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new jt,this._sphericalDelta=new jt,this._scale=1,this._panOffset=new Y,this._rotateStart=new G,this._rotateEnd=new G,this._rotateDelta=new G,this._panStart=new G,this._panEnd=new G,this._panDelta=new G,this._dollyStart=new G,this._dollyEnd=new G,this._dollyDelta=new G,this._dollyDirection=new Y,this._mouse=new G,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=js.bind(this),this._onPointerDown=As.bind(this),this._onPointerUp=Ms.bind(this),this._onContextMenu=zs.bind(this),this._onMouseWheel=Fs.bind(this),this._onKeyDown=Is.bind(this),this._onTouchStart=Ls.bind(this),this._onTouchMove=Rs.bind(this),this._onMouseDown=Ns.bind(this),this._onMouseMove=Ps.bind(this),this._interceptControlDown=Bs.bind(this),this._interceptControlUp=Vs.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e===`grab`?this.domElement.style.cursor=`grab`:this.domElement.style.cursor=`auto`}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener(`pointerdown`,this._onPointerDown),this.domElement.addEventListener(`pointercancel`,this._onPointerUp),this.domElement.addEventListener(`contextmenu`,this._onContextMenu),this.domElement.addEventListener(`wheel`,this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener(`keydown`,this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction=`none`}disconnect(){this.state=Ds.NONE,this.domElement.removeEventListener(`pointerdown`,this._onPointerDown),this.domElement.ownerDocument.removeEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.removeEventListener(`pointerup`,this._onPointerUp),this.domElement.removeEventListener(`pointercancel`,this._onPointerUp),this.domElement.removeEventListener(`wheel`,this._onMouseWheel),this.domElement.removeEventListener(`contextmenu`,this._onContextMenu),this.stopListenToKeyEvents();let e=this.domElement.getRootNode();e.removeEventListener(`keydown`,this._interceptControlDown,{capture:!0}),e.removeEventListener(`keyup`,this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction=``,this.domElement.style.cursor=`auto`}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener(`keydown`,this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener(`keydown`,this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(ys),this.update(),this.state=Ds.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){let t=this.object.position;Ts.copy(t).sub(this.target),Ts.applyQuaternion(this._quat),this._spherical.setFromVector3(Ts),this.autoRotate&&this.state===Ds.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(n)&&isFinite(r)&&(n<-Math.PI?n+=Es:n>Math.PI&&(n-=Es),r<-Math.PI?r+=Es:r>Math.PI&&(r-=Es),n<=r?this._spherical.theta=Math.max(n,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+r)/2?Math.max(n,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let i=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let e=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),i=e!=this._spherical.radius}if(Ts.setFromSpherical(this._spherical),Ts.applyQuaternion(this._quatInverse),t.copy(this.target).add(Ts),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let e=null;if(this.object.isPerspectiveCamera){let t=Ts.length();e=this._clampDistance(t*this._scale);let n=t-e;this.object.position.addScaledVector(this._dollyDirection,n),this.object.updateMatrixWorld(),i=!!n}else if(this.object.isOrthographicCamera){let t=new Y(this._mouse.x,this._mouse.y,0);t.unproject(this.object);let n=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),i=n!==this.object.zoom;let r=new Y(this._mouse.x,this._mouse.y,0);r.unproject(this.object),this.object.position.sub(r).add(t),this.object.updateMatrixWorld(),e=Ts.length()}else console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled.`),this.zoomToCursor=!1;e!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(e).add(this.object.position):(Ss.origin.copy(this.object.position),Ss.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Ss.direction))<ws?this.object.lookAt(this.target):(Cs.setFromNormalAndCoplanarPoint(this.object.up,this.target),Ss.intersectPlane(Cs,this.target))))}else if(this.object.isOrthographicCamera){let e=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),e!==this.object.zoom&&(this.object.updateProjectionMatrix(),i=!0)}return this._scale=1,this._performCursorZoom=!1,i||this._lastPosition.distanceToSquared(this.object.position)>Os||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Os||this._lastTargetPosition.distanceToSquared(this.target)>Os?(this.dispatchEvent(ys),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e===null?Es/60/60*this.autoRotateSpeed:Es/60*this.autoRotateSpeed*e}_getZoomScale(e){let t=Math.abs(e*.01);return .95**(this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Ts.setFromMatrixColumn(t,0),Ts.multiplyScalar(-e),this._panOffset.add(Ts)}_panUp(e,t){this.screenSpacePanning===!0?Ts.setFromMatrixColumn(t,1):(Ts.setFromMatrixColumn(t,0),Ts.crossVectors(this.object.up,Ts)),Ts.multiplyScalar(e),this._panOffset.add(Ts)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let r=this.object.position;Ts.copy(r).sub(this.target);let i=Ts.length();i*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*i/n.clientHeight,this.object.matrix),this._panUp(2*t*i/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.`),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.`),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn(`WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.`),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),r=e-n.left,i=t-n.top,a=n.width,o=n.height;this._mouse.x=r/a*2-1,this._mouse.y=-(i/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Es*this._rotateDelta.x/t.clientHeight),this._rotateUp(Es*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(Es*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-Es*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(Es*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-Es*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateStart.set(n,r)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panStart.set(n,r)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,r=e.pageY-t.y,i=Math.sqrt(n*n+r*r);this._dollyStart.set(0,i)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateEnd.set(n,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(Es*this._rotateDelta.x/t.clientHeight),this._rotateUp(Es*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panEnd.set(n,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,r=e.pageY-t.y,i=Math.sqrt(n*n+r*r);this._dollyEnd.set(0,i),this._dollyDelta.set(0,(this._dollyEnd.y/this._dollyStart.y)**+this.zoomSpeed),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new G,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function As(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.ownerDocument.addEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.addEventListener(`pointerup`,this._onPointerUp)),!this._isTrackingPointer(e)&&(this._addPointer(e),e.pointerType===`touch`?this._onTouchStart(e):this._onMouseDown(e),this._cursorStyle===`grab`&&(this.domElement.style.cursor=`grabbing`)))}function js(e){this.enabled!==!1&&(e.pointerType===`touch`?this._onTouchMove(e):this._onMouseMove(e))}function Ms(e){switch(this._removePointer(e),this._pointers.length){case 0:this.domElement.releasePointerCapture(e.pointerId),this.domElement.ownerDocument.removeEventListener(`pointermove`,this._onPointerMove),this.domElement.ownerDocument.removeEventListener(`pointerup`,this._onPointerUp),this.dispatchEvent(xs),this.state=Ds.NONE,this._cursorStyle===`grab`&&(this.domElement.style.cursor=`grab`);break;case 1:let t=this._pointers[0],n=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:n.x,pageY:n.y})}}function Ns(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Zt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(e),this.state=Ds.DOLLY;break;case Zt.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=Ds.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=Ds.ROTATE}break;case Zt.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=Ds.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=Ds.PAN}break;default:this.state=Ds.NONE}this.state!==Ds.NONE&&this.dispatchEvent(bs)}function Ps(e){switch(this.state){case Ds.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(e);break;case Ds.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(e);break;case Ds.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(e)}}function Fs(e){this.enabled!==!1&&this.enableZoom!==!1&&this.state===Ds.NONE&&(e.preventDefault(),this.dispatchEvent(bs),this._handleMouseWheel(this._customWheelEvent(e)),this.dispatchEvent(xs))}function Is(e){this.enabled!==!1&&this._handleKeyDown(e)}function Ls(e){switch(this._trackPointer(e),this._pointers.length){case 1:switch(this.touches.ONE){case Ee.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(e),this.state=Ds.TOUCH_ROTATE;break;case Ee.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(e),this.state=Ds.TOUCH_PAN;break;default:this.state=Ds.NONE}break;case 2:switch(this.touches.TWO){case Ee.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(e),this.state=Ds.TOUCH_DOLLY_PAN;break;case Ee.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(e),this.state=Ds.TOUCH_DOLLY_ROTATE;break;default:this.state=Ds.NONE}break;default:this.state=Ds.NONE}this.state!==Ds.NONE&&this.dispatchEvent(bs)}function Rs(e){switch(this._trackPointer(e),this.state){case Ds.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(e),this.update();break;case Ds.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(e),this.update();break;case Ds.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(e),this.update();break;case Ds.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(e),this.update();break;default:this.state=Ds.NONE}}function zs(e){this.enabled!==!1&&e.preventDefault()}function Bs(e){e.key===`Control`&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener(`keyup`,this._interceptControlUp,{passive:!0,capture:!0}))}function Vs(e){e.key===`Control`&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener(`keyup`,this._interceptControlUp,{passive:!0,capture:!0}))}function Hs(e){let t=e.map((e,t)=>t),n=e=>t[e]===e?e:t[e]=n(t[e]);for(let r=0;r<e.length;r++)for(let i=r+1;i<e.length;i++){let a=e[r],o=e[i];a.left<o.right&&a.right>o.left&&a.top<o.bottom&&a.bottom>o.top&&(t[n(i)]=n(r))}let r=new Map;return e.forEach((e,t)=>{let i=n(t);r.set(i,[...r.get(i)??[],t])}),[...r.values()]}var Us=70*Math.PI/180,Ws=10,Gs=14,Ks=40,qs=24;function Js(e,t,n=200){let r=e>Ws?Math.ceil(e/2):e,i=e-r,a=Math.max(r,i),o=Math.max(80,n),s=(t-Math.min(Gs,t*.5))/o,c=a>0?Math.min(s,2*Us/a):s,l=t/c-o,u=a>1?(a-1)/2*c:0,d=Math.min(l-Ks,l*Math.cos(u)-qs),f=(e,t,n)=>Array.from({length:e},(r,i)=>({angle:t+(i-(e-1)/2)*c,left:n}));return{radius:l,pivotShift:d,maxHalfArc:u,spokes:[...f(i,0,!1),...f(r,Math.PI,!0)]}}function Ys(e){let t=e%10>=2&&e%10<=4&&(e%100<12||e%100>14);return`${e} ${e===1?`obiekt`:t?`obiekty`:`obiektów`}`}function Xs(e){let{image:t,width:n,height:r}=e,{x:i,y:a,side:o}=Ya(e,n,r),s=`http://www.w3.org/2000/svg`,c=document.createElementNS(s,`svg`);c.classList.add(`obs-spoke-cutout`),c.setAttribute(`aria-hidden`,`true`),c.setAttribute(`viewBox`,`${i} ${a} ${o} ${o}`);let l=document.createElementNS(s,`image`);return l.setAttribute(`href`,t),l.setAttribute(`width`,String(n)),l.setAttribute(`height`,String(r)),l.setAttribute(`preserveAspectRatio`,`none`),c.appendChild(l),c}function Zs(e,t,n,r,i,a,o){let s=t.slice(0,40),c=t.length-s.length,l=Js(s.length,30).spokes,u=document.createElement(`div`);u.className=`obs-fan`,u.setAttribute(`role`,`menu`),u.setAttribute(`aria-label`,`Obiekty grupy według odległości`);let d=new Map,f=null,p=s.map((e,t)=>{let n=document.createElement(`button`);return n.type=`button`,n.className=`obs-spoke${l[t].left?` left`:``}`,n.textContent=e.text,e.cutout&&n.appendChild(Xs(e.cutout)),n.setAttribute(`role`,`menuitem`),n.addEventListener(`pointerenter`,()=>{f=e.id,o.hover(e.id)}),n.addEventListener(`pointerleave`,()=>{f===e.id&&(f=null,o.hover(null))}),n.addEventListener(`click`,()=>o.pick(e.id)),d.set(e.id,n),u.appendChild(n),n});e.appendChild(u);let m=Math.max(0,...p.map(e=>e.offsetWidth)),{radius:h,pivotShift:g,maxHalfArc:_,spokes:v}=Js(s.length,30,m),y=h+m,b=Math.hypot(y,14)-g,x=(e,t,n)=>t>n?(t+n)/2:Math.max(t,Math.min(n,e)),S=y*Math.sin(_)+14*Math.cos(_)+4,C=v.some(e=>e.left),w=v.some(e=>!e.left),T=x(n,C?b+4:4,w?i-b-4:i-4),E=x(r,S,a-S);if(p.forEach((e,t)=>{let{angle:n,left:r}=v[t],i=r?T+g:T-g;e.style.width=`${m}px`,e.style.transform=r?`translate(${i.toFixed(1)}px, ${E.toFixed(1)}px) rotate(${(n-Math.PI).toFixed(4)}rad) translate(calc(-100% - ${h.toFixed(1)}px), -50%)`:`translate(${i.toFixed(1)}px, ${E.toFixed(1)}px) rotate(${n.toFixed(4)}rad) translate(${h.toFixed(1)}px, -50%)`}),c>0){let e=document.createElement(`span`);e.className=`obs-fan-more`,e.textContent=`+${c} na liście`,e.style.left=`${T}px`,e.style.top=`${Math.max(4,E-S+32)}px`,u.appendChild(e)}e.classList.add(`fan-open`);let D=!0,O=e=>{e.key===`Escape`&&(e.stopPropagation(),k.close())};window.addEventListener(`keydown`,O,!0);let k={setSelected(e){for(let[t,n]of d)n.classList.toggle(`selected`,t===e)},close(){D&&(D=!1,window.removeEventListener(`keydown`,O,!0),u.remove(),e.querySelector(`:scope > .obs-fan`)||e.classList.remove(`fan-open`),f!==null&&(f=null,o.hover(null)),o.closed())}};return k}var Qs=.34,$s=3e4;function ec(e,t,n){let r=Math.sin(e*127.1+t*311.7+n*74.7)*43758.5453123;return r-Math.floor(r)}function tc(e,t,n){let r=Math.floor(e),i=Math.floor(t),a=Math.floor(n),o=e-r,s=t-i,c=n-a,l=o*o*(3-2*o),u=s*s*(3-2*s),d=c*c*(3-2*c),f=(e,t,n)=>e+(t-e)*n,p=f(ec(r,i,a),ec(r+1,i,a),l),m=f(ec(r,i+1,a),ec(r+1,i+1,a),l),h=f(ec(r,i,a+1),ec(r+1,i,a+1),l),g=f(ec(r,i+1,a+1),ec(r+1,i+1,a+1),l);return f(f(p,m,u),f(h,g,u),d)}function nc(e,t,n){let r=0,i=.5,a=1;for(let o=0;o<4;o++)r+=i*tc(e*a,t*a,n*a),a*=2.08,i*=.5;return r}var rc=384,ic=192;function ac(e,t,n){do{let n=((t+.5)/ic-.5)*Math.PI,r=Math.cos(n),i=Math.sin(n),a=Math.max(0,1-Math.abs(i)**3.5);for(let n=0;n<rc;n++){let o=(n+.5)/rc*Math.PI*2,s=Math.cos(o)*r,c=i,l=Math.sin(o)*r,u=nc(s*2.1+3.1,c*2.1,l*2.1-1.7)*.65,d=nc(s*3.8+u,c*4.6+1.3,l*3.8-u),f=Math.max(0,Math.min(1,(d-.48)/.28))*a,p=(t*rc+n)*4;e[p]=240,e[p+1]=248,e[p+2]=255,e[p+3]=Math.round(f*255)}t++}while(t<ic&&n()>1);return t}var oc=null,sc=new Map;function cc(){if(oc)return oc;let e=document.createElement(`canvas`);e.width=rc,e.height=ic;let t=e.getContext(`2d`);if(!t)return null;let n={canvas:e,done:!1,waiting:new Set};oc=n;let r=t.createImageData(rc,ic),i=e=>window.requestIdleCallback?window.requestIdleCallback(e):window.setTimeout(()=>e({didTimeout:!1,timeRemaining:()=>8}),16),a=0,o=e=>{if(a=ac(r.data,a,()=>e.timeRemaining()),a<ic)i(o);else{t.putImageData(r,0,0),n.done=!0;for(let{texture:e,onReady:t}of n.waiting)e.needsUpdate=!0,t?.();n.waiting.clear()}};return i(o),n}function lc(e,t){if(typeof document>`u`)return new ke;let n=cc();if(!n)return new ke;let r=new un(n.canvas);if(r.colorSpace=Be,r.wrapS=wt,r.anisotropy=e,!n.done){let e={texture:r,onReady:t};n.waiting.add(e),r.addEventListener(`dispose`,()=>n.waiting.delete(e))}return r}function uc(e,t,n){if(typeof document>`u`)return;let r=sc.get(e.src);if(r){t.image=r.bump,t.needsUpdate=!0,n.image=r.spec,n.needsUpdate=!0;return}let i=e.naturalWidth||e.width,a=e.naturalHeight||e.height,o=Math.min(1024,Math.max(1,i||512)),s=Math.min(512,Math.max(1,a||256)),c=document.createElement(`canvas`);c.width=o,c.height=s;let l=c.getContext(`2d`,{willReadFrequently:!0});if(!l)return;l.drawImage(e,0,0,o,s);let u=l.getImageData(0,0,o,s).data,d=document.createElement(`canvas`);d.width=o,d.height=s;let f=d.getContext(`2d`),p=document.createElement(`canvas`);p.width=o,p.height=s;let m=p.getContext(`2d`);if(!f||!m)return;let h=f.createImageData(o,s),g=m.createImageData(o,s),_=e=>e<0?0:e>1?1:e;for(let e=0;e<u.length;e+=4){let t=u[e],n=u[e+1],r=u[e+2],i=_((r-t-10)/34)*_((r-n*.92+4)/24)*_((205-t)/55),a=Math.round(14+i*228),o=70+_(((.299*t+.587*n+.114*r)/255-.1)*1.45)*185,s=Math.round(i*48+(1-i)*o);h.data[e]=h.data[e+1]=h.data[e+2]=s,h.data[e+3]=255,g.data[e]=g.data[e+1]=g.data[e+2]=a,g.data[e+3]=255}f.putImageData(h,0,0),m.putImageData(g,0,0),e.src&&sc.set(e.src,{bump:d,spec:p}),t.image=d,t.needsUpdate=!0,n.image=p,n.needsUpdate=!0}function dc(e,t=4,n){let r=Math.max(1,Math.min(8,t)),i=new ke,a=new ke;i.anisotropy=r,a.anisotropy=r;let o=new Fe().load(`${e}textures/earth.webp`,e=>{typeof HTMLImageElement<`u`&&e.image instanceof HTMLImageElement&&uc(e.image,i,a),n?.()});o.colorSpace=Be,o.anisotropy=r;let s=lc(r,n);return{map:o,bumpMap:i,specularMap:a,cloudMap:s,dispose(){o.dispose(),i.dispose(),a.dispose(),s.dispose()}}}function fc(){let e={uOpacity:{value:1}};return{material:new Ue({uniforms:e,transparent:!0,depthWrite:!1,blending:2,vertexShader:`
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,fragmentShader:`
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float ndotv = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
        float rim = pow(1.0 - ndotv, 3.0);
        vec3 color = mix(vec3(0.28, 0.68, 1.0), vec3(0.68, 0.92, 1.0), rim);
        float alpha = rim * 0.5 * uOpacity;
        gl_FragColor = vec4(color, alpha);
      }
    `}),uniforms:e}}function pc(){let e={uOpacity:{value:1}};return{material:new Ue({uniforms:e,side:1,transparent:!0,depthWrite:!1,blending:2,vertexShader:`
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,fragmentShader:`
      uniform float uOpacity;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float d = max(0.0, -dot(normalize(vNormalView), normalize(vViewDir)));
        float rim = pow(clamp(d / 0.54, 0.0, 1.0), 2.8);
        float innerMask = 1.0 - smoothstep(0.54, 0.94, d);
        vec3 color = mix(vec3(0.22, 0.58, 0.98), vec3(0.58, 0.88, 1.0), rim);
        float alpha = rim * innerMask * 0.32 * uOpacity;
        gl_FragColor = vec4(color, alpha);
      }
    `}),uniforms:e}}function mc(e,t){let n=new Me(e,64,48),r=new Tt({map:t.map,bumpMap:t.bumpMap,bumpScale:.032*e,specularMap:t.specularMap,specular:new cn(7652607),shininess:36,emissive:new cn(398890),emissiveIntensity:.45}),i=new pt(n,r),a=new Me(e*1.012,64,48),o=new Tt({map:t.cloudMap,transparent:!0,opacity:Qs,depthWrite:!1,shininess:4,specular:new cn(2241348),emissive:new cn(793907),emissiveIntensity:.25}),s=new pt(a,o);s.renderOrder=1;let c=new Me(e*1.016,64,48),{material:l,uniforms:u}=fc(),d=new pt(c,l);d.renderOrder=2;let f=new Me(e*1.18,64,48),{material:p,uniforms:m}=pc(),h=new pt(f,p);return h.renderOrder=3,i.add(s,d,h),i.userData.setEarthOpacity=e=>{let t=Math.max(0,Math.min(1,e));r.transparent=t<.999,r.opacity=t,o.opacity=Qs*t,u.uOpacity.value=t,m.uOpacity.value=t;let n=t>0;s.visible=n,d.visible=n,h.visible=n},{mesh:i,clouds:s,spin(e){let t=e/$s*2*Math.PI;i.rotation.y=t,s.rotation.y=t*.25},disposables:[n,r,a,o,c,l,f,p]}}function hc(e,t){let n=e.userData.setEarthOpacity;if(n){n(t);return}let r=e.material,i=Math.max(0,Math.min(1,t));r.transparent=i<.999,r.opacity=i}var gc=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],_c=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],vc=(e,t,n=1)=>[e[0]+t[0]*n,e[1]+t[1]*n,e[2]+t[2]*n],yc=e=>{let t=Math.hypot(...e);return[e[0]/t,e[1]/t,e[2]/t]},bc=(e,t)=>T(oe({raDeg:e,decDeg:t}));function xc(e,t,n){let r=e.wcs,i=r?.cd;if(!Array.isArray(i)||i.length!==2||i.some(e=>!Array.isArray(e)||e.length!==2||e.some(e=>!Number.isFinite(e))))return null;let a=i[0][0]*i[1][1]-i[0][1]*i[1][0];if(!(Math.abs(a)>0))return null;let{raDeg:o,decDeg:s}=e,c=bc(o,s),l=bc(o+90,0),u=bc(o,s+90),d=[l[0]*i[0][0]+u[0]*i[1][0],l[1]*i[0][0]+u[1]*i[1][0],l[2]*i[0][0]+u[2]*i[1][0]],f=[-(l[0]*i[0][1]+u[0]*i[1][1]),-(l[1]*i[0][1]+u[1]*i[1][1]),-(l[2]*i[0][1]+u[2]*i[1][1])],p=[-c[0],-c[1],-c[2]],m=yc(vc(d,c,-gc(d,c))),h=_c(p,m),g=gc(f,h)<0;g&&(m=[-m[0],-m[1],-m[2]],h=_c(p,m));let _=Array.isArray(r?.crpix)&&r.crpix.length===2&&r.crpix.every(Number.isFinite)?r.crpix:[(t-1)/2,(n-1)/2];return{center:c,x:m,y:h,mirrored:g,radPerPx:Math.sqrt(Math.abs(a))*Math.PI/180,refPx:[_[0],_[1]]}}function Sc(e,t,n){return[t/2*e.radPerPx,n/2*e.radPerPx]}var Cc=1.12,wc=4;function Tc(e){let t=0,n=0;for(let r of e)r>0&&(r>=15e4?n++:t=Math.max(t,r/1e3));return{length:t>0?t*Cc:wc,farthest:t,outside:n}}function Ec(e){let t=Math.max(0,...e.filter(e=>e>0));return t>0?t*Cc:wc/m}function Dc(e,t){e.el.textContent=t.join(`
`),e.width=Math.max(...t.map(e=>e.length))*6.1+17,e.height=t.length*13.5+8}var Oc=32,kc=220,Ac=200;function jc({width:e,height:t,gap:n},r){if(r===0)return[n,-9];if(r===1)return[-n-e,-9];if(r===2)return[-e/2,-n-1-t];if(r===3)return[-e/2,n+1];let i=r-4,a=(i>>2)+1;return[i&1?-n-a*9-e:n+a*9,-t/2+(i&2?a:-a)*(t+4)]}function Mc(e,t){for(let n=0;n<16;n++)if(Math.abs(e.elements[n]-t.elements[n])>1e-6*Math.max(1,Math.abs(t.elements[n])))return!1;return!0}function Nc(e,t,{onPick:n,onHover:r}={}){let i=document.createElement(`div`);i.className=`obs-labels ${t}`,e.mount.appendChild(i);let a=[],o=[],s=new Map,c=!0,l=!0,u=!0,d=0,f=0,p=-1/0,m=new nn,h=new nn,g=new Y,_=!1,v=()=>{for(let e of s.values())e.close()};e.renderer.domElement.addEventListener(`pointerdown`,v),e.renderer.domElement.addEventListener(`wheel`,v);let y=(e,t,n,r,o)=>{let s=document.createElement(`div`);s.className=`obs-leader`,r&&(n.style.borderLeftColor=s.style.background=r),i.appendChild(s),i.appendChild(n);let c={position:e,el:n,leader:s,gap:o,width:0,height:0,spot:0,from:0,moved:-1/0,shown:!1};return Dc(c,t),a.push(c),l=!0,c},b=t=>{let a=s.get(t);if(a){a.close();return}let{camera:o,mount:c}=e;g.copy(t.position).project(o);let l=[...t.members??[]].sort((e,t)=>(e.distLy??0)-(t.distLy??0)||e.id.localeCompare(t.id)).map(e=>({id:e.id,text:`${e.id} · ${I(e.distLy??null)}`,cutout:e.cutout})),u=Zs(i,l,(g.x+1)/2*c.clientWidth,(1-g.y)/2*c.clientHeight,c.clientWidth,c.clientHeight,{hover:e=>r?.(e),pick:e=>{n?.(e);for(let t of s.values())t.setSelected(e)},closed:()=>{s.delete(t),t.el.setAttribute(`aria-expanded`,`false`),t.el.title=`Pokaż obiekty grupy`}});s.set(t,u),t.el.setAttribute(`aria-expanded`,`true`),t.el.title=`Zwiń listę obiektów`},x=()=>{let e=document.createElement(`button`);e.type=`button`,e.className=`obs-label space-photo-label obs-group`,e.title=`Pokaż obiekty grupy`,e.setAttribute(`aria-expanded`,`false`);let t=y(new Y,[``],e,void 0,13);return e.addEventListener(`click`,()=>b(t)),t.hidden=!0,o.push(t),t},S=(t,n)=>{let r=[],i=[];for(let o of a){if(!o.id||o.pinned||o.hidden||!c||(g.copy(o.position).project(e.camera),!(g.z<1&&Math.abs(g.x)<1.1&&Math.abs(g.y)<1.1)))continue;let a=(g.x+1)/2*t,s=(1-g.y)/2*n,[l,u]=jc(o,0);r.push(o),i.push({left:a-o.gap,top:Math.min(s-o.gap,s+u),right:a+l+o.width,bottom:Math.max(s+o.gap,s+u+o.height)})}let l=Hs(i).filter(e=>e.length>1).map(e=>e.map(e=>r[e])),u=new Set(l.flat());for(let e of a){let t=u.has(e);!!e.grouped!==t&&(e.grouped=t,e.onGroup?.(t))}let d=new Set(o),f=l.map(e=>{let t=o.find(({members:t})=>t?.length===e.length&&e.every((e,n)=>e===t[n]));return t&&d.delete(t),t}),p=[...d];for(let e of p)s.get(e)?.close(),e.hidden=!0,e.members=void 0;l.forEach((e,t)=>{let n=f[t]??p.pop()??x();n.hidden=!1,n.members=e,n.position.set(0,0,0);for(let t of e)n.position.add(t.position);n.position.divideScalar(e.length);let r=e.map(e=>e.distLy).filter(e=>e!==void 0),i=[Ys(e.length),r.length?ie(Math.min(...r),Math.max(...r)):``];n.el.textContent!==i.join(`
`)&&Dc(n,i)})};return{root:i,add(e,t,{className:n=``,color:r,gap:i=13,id:a,distLy:o,cutout:s,onGroup:c}={}){let l=document.createElement(`div`);l.className=`obs-label space-photo-label ${n}`;let u=y(e,t,l,r,i);return Object.assign(u,{id:a,distLy:o,cutout:s,onGroup:c}),u},clear(){v();for(let e of a)e.el.remove(),e.leader.remove();a=[],o.length=0,_=!1,l=!0},setVisible(e){c=e,i.style.display=e?``:`none`,e||v(),l=!0},invalidate(){l=!0},update(t){let{camera:n,mount:r}=e,i=r.clientWidth,o=r.clientHeight,s=i!==d||o!==f;s&&v();let y=s||!Mc(m,n.matrixWorld)||!Mc(h,n.projectionMatrix);y&&(p=t,u=!0,d=i,f=o,m.copy(n.matrixWorld),h.copy(n.projectionMatrix));let b=u&&t-p>=kc;if(!y&&!l&&!b&&!a.some(e=>t-e.moved<Ac))return;(b||l&&!y||!_)&&(S(i,o),_=!0);let x=a.flatMap(e=>{g.copy(e.position).project(n);let t=c&&!e.hidden&&!e.grouped&&g.z<1&&Math.abs(g.x)<1.1&&Math.abs(g.y)<1.1;e.el.style.display=t?``:`none`,e.leader.style.display=`none`;let r=t&&!e.shown;return e.shown=t,t?[{label:e,x:(g.x+1)/2*i,y:(1-g.y)/2*o,fresh:r}]:[]}),C=x.filter(e=>b||e.fresh);if(C.length){let e=({label:e,x:t,y:n},r)=>{let[i,a]=jc(e,r);return{left:t+i,top:n+a,right:t+i+e.width,bottom:n+a+e.height,owner:e}},n=x.map(({label:e,x:t,y:n})=>({left:t-e.gap*.7,top:n-e.gap*.7,right:t+e.gap*.7,bottom:n+e.gap*.7,owner:e}));for(let t of x)C.includes(t)||n.push(e(t,t.label.spot));for(let r of C){let{label:i}=r,a=t=>{let a=e(r,t);return!n.some(e=>e.owner!==i&&a.left<e.right&&a.right>e.left&&a.top<e.bottom&&a.bottom>e.top)},o=!r.fresh&&i.spot<4&&a(i.spot)?i.spot:-1;for(let e=0;o<0&&e<Oc;e++)a(e)&&(o=e);o<0&&(o=r.fresh?0:i.spot),o!==i.spot&&(i.from=r.fresh?o:i.spot,i.moved=r.fresh?-1/0:t,i.spot=o),n.push(e(r,o))}}b&&(u=!1),l=!1;for(let{label:e,x:n,y:r}of x){let i=Math.min(1,(t-e.moved)/Ac),a=i*i*(3-2*i),[o,s]=jc(e,e.from),[c,l]=jc(e,e.spot),u=Math.round(n+o+(c-o)*a),d=Math.round(r+s+(l-s)*a);if(e.el.style.transform=`translate(${u}px, ${d}px)`,e.spot<4&&(i>=1||e.from<4))continue;let f=Math.max(u,Math.min(u+e.width,n)),p=Math.max(d,Math.min(d+e.height,r)),m=Math.hypot(f-n,p-r),h=e.gap*.7;if(m<=h+2)continue;let g=Math.atan2(p-r,f-n);e.leader.style.display=``,e.leader.style.width=`${(m-h).toFixed(1)}px`,e.leader.style.transform=`translate(${(n+Math.cos(g)*h).toFixed(1)}px, ${(r+Math.sin(g)*h).toFixed(1)}px) rotate(${g.toFixed(4)}rad)`}},dispose(){v(),e.renderer.domElement.removeEventListener(`pointerdown`,v),e.renderer.domElement.removeEventListener(`wheel`,v),i.remove()}}}var Pc=1.22,Fc=.04,Ic=.024,Lc=.056,Rc=.034,zc=1/Math.tan(dt.degToRad(25)),Bc=11;function Vc(e,t,n,r,i,a){let{sunPos:o}=e,s=new Y(...t.center),c=new Ge,l=[],u=[],d=.25*a,f=.18*a,p=new R({color:i,dashSize:d,gapSize:f,transparent:!0,opacity:.85,depthWrite:!1}),m=new Ye(new tt().setFromPoints([new Y,s.clone().multiplyScalar(r)]),p);m.position.copy(o),m.computeLineDistances(),c.add(m),l.push(m.geometry,p);let h=new Ge;h.position.copy(o),h.quaternion.setFromRotationMatrix(new nn().makeBasis(new Y(...t.x),new Y(...t.y),s.clone().negate()));let g=h.quaternion.clone(),_=[[1,1],[-1,1],[-1,-1],[1,-1]],v=[];for(let[e,t]of _)v.push(0,0,0,e*r,t*r,-r);for(let e=0;e<4;e++){let[t,n]=_[e],[i,a]=_[(e+1)%4];v.push(t*r,n*r,-r,i*r,a*r,-r)}let y=new tt;y.setAttribute(`position`,new Re(v,3));let b=new Ie({color:i,transparent:!0,opacity:.45,depthWrite:!1});h.add(new $t(y,b));let x=Sc(t,n.width,n.height);h.scale.set(x[0],x[1],1),c.add(h);let S=[];for(let e=0;e<4;e++){let[t,n]=_[e],[i,a]=_[(e+1)%4];S.push(0,0,0,t*r,n*r,-r,i*r,a*r,-r)}let C=new tt;C.setAttribute(`position`,new Re(S,3));let w=new yt({color:i,transparent:!0,opacity:.07,side:2,depthWrite:!1}),T=new pt(C,w);return T.renderOrder=-1,h.add(T),l.push(y,b,C,w),b.userData.cone=!0,w.userData.faces=!0,u.push(b,w),{group:c,cone:h,line:m,fieldTan:x,materials:u,disposables:l,setOpacity(t,n=t,r=n,i=t){p.opacity=.85*i,m.visible=i>0;for(let e of u)e.userData.base??=e.opacity,e.opacity=e.userData.base*(e.userData.faces?r:e.userData.cone?n:t);e.invalidate()},alignSightLine(e,t,n=t){m.scale.setScalar(Ho(e,t/n,470*t/r)),p.scale=dt.lerp(1,470/r,e),p.dashSize=dt.lerp(d,2,e),p.gapSize=dt.lerp(f,2,e)},setConeRoll(e){h.quaternion.copy(g),h.rotateZ(e)}}}function Hc(e,t,i,a,o,s){let c=xc(t.astrometry,t.width,t.height);if(!c)return null;let{sunPos:l,camera:u,controls:f,mount:p}=e,h=new Y(...c.center),g=Ja(t.cuts).map(e=>{let t=new Y(...T(oe(e))),n=new Y(...r(t.toArray(),e.distLy)).distanceTo(l);return{cut:e,kind:Xa(e.distLy,i),world:l.clone().addScaledVector(t,n),reach:n}}),_=g.filter(e=>e.kind===`position`||e.kind===`local`).sort((e,t)=>e.cut.distLy-t.cut.distLy),v=g.filter(e=>e.kind===`outside`),y=i===`galaxy`?Tc(g.map(e=>e.cut.distLy)).length:Ec(_.map(e=>e.reach)),b=i===`universe`?1/m:1,x=Math.max(y,2*b)/16,S=Vc(e,c,t,y,o,x),{group:C,cone:w,line:E,fieldTan:D,materials:O,disposables:k}=S;if(C.name=`photo-guide`,v.length){let e=new R({color:o,dashSize:.09*x,gapSize:.25*x,transparent:!0,opacity:.45,depthWrite:!1}),t=new Ye(new tt().setFromPoints([h.clone().multiplyScalar(y),h.clone().multiplyScalar(y*Pc)]),e);t.computeLineDistances(),E.add(t),k.push(t.geometry,e),O.push(e)}let ee=new Ge;C.add(ee);let A=null,j=null,M=Nc(e,`space-photo-labels`,{onPick:s,onHover:e=>ce(e)}),N=[],te=new Map,P=e=>a[e]??d[e],F=1,ne=0,re=document.createElement(`div`);re.className=`obs-label space-photo-label hovered`,re.style.display=`none`,M.root.appendChild(re);let ie=[0,0],ae=null,L=e=>{let t=e.id===A||e.id===j;e.label.pinned=e.id===A,e.label.el.classList.toggle(`selected`,e.id===A),e.label.el.classList.toggle(`hovered`,e.id===j);let n=t?Lc:e.grouped?Ic:Fc;e.sprite.scale.setScalar(F*(n+(Fc-n)*ne)),e.sprite.renderOrder=t?6:5};for(let{cut:n,world:r}of _){let i=te.get(n.type);i||(i=en(n.type,P(n.type)),te.set(n.type,i),k.push(i));let a=Mt(i,Fc);a.position.copy(r),ee.add(a),k.push(a.material),O.push(a.material),e.anchors.add(a.position);let o=[n.id,`≈ ${I(n.distLy)}`],s=P(n.type),c={id:n.id,text:o.join(`
`),color:s,position:r.toArray(),sprite:a,label:null,grouped:!1};c.label=M.add(a.position,o,{color:s,id:n.id,distLy:n.distLy,cutout:{image:t.image,width:t.width,height:t.height,x:n.x,y:n.y,radius:n.radius},onGroup:t=>{c.grouped=t,L(c),e.invalidate()}}),N.push(c)}let se=new Map(N.map(e=>[e.id,e])),z=t=>{let n=[A,j];t();for(let e of new Set([...n,A,j])){let t=e?se.get(e):void 0;t&&L(t)}M.invalidate(),e.invalidate()};function ce(e){e!==j&&z(()=>{j=e})}let B=null;if(v.length){let e=lt(o);B=Mt(e,Rc),B.position.copy(l).addScaledVector(h,y*Pc),ee.add(B),k.push(e,B.material),O.push(B.material);let t=v.map(e=>e.cut.id),n=t.slice(0,3).join(`, `)+(t.length>3?` +${t.length-3}`:``);M.add(B.position,[n,`poza Drogą Mleczną`],{className:`dashed`,color:o})}e.scene.add(C);let V=e=>{let t=zc/u.projectionMatrix.elements[5];if(t!==F){F=t;for(let e of N)L(e);B?.scale.setScalar(F*Rc)}M.update(e);let n=j?se.get(j):void 0;if(!n||!le||!C.visible||!n.grouped&&!n.label.hidden||M.root.classList.contains(`fan-open`)||(H.copy(n.sprite.position).project(u),H.z>=1||Math.abs(H.x)>=1.1||Math.abs(H.y)>=1.1)){re.style.display=`none`;return}if(ae!==n.id){ae=n.id,re.textContent=n.text,re.style.borderLeftColor=n.color;let e=n.text.split(`
`);ie=[Math.max(...e.map(e=>e.length))*6.1+17,e.length*13.5+8]}let r=p.clientWidth,i=p.clientHeight,a=(H.x+1)/2*r,o=(1-H.y)/2*i,[s,c]=ie,l=Math.round(a+13+s<=r-2?a+13:Math.max(2,a-13-s)),d=Math.round(Math.max(2,Math.min(i-c-2,o-9)));re.style.display=``,re.style.transform=`translate(${l}px, ${d}px)`};e.layout.add(V);let le=!0,H=new Y,ue=(e,t)=>{if(!le||!C.visible)return null;let n=null,r=Bc;for(let i of N){if(H.copy(i.sprite.position).project(u),H.z>=1)continue;let a=Math.hypot((H.x+1)/2*p.clientWidth-e,(1-H.y)/2*p.clientHeight-t);a<r&&(n=i.id,r=a)}return n},de=(e,t,n)=>{let r=ue(e,t);return r&&n&&s(r),!!r};e.claims.add(de);let fe=e=>{if(e.buttons)return;let t=p.getBoundingClientRect(),n=ue(e.clientX-t.left,e.clientY-t.top);p.style.cursor=n?`pointer`:``,(n||N.some(e=>e.id===j))&&ce(n)},pe=e.renderer.domElement;pe.addEventListener(`pointermove`,fe),e.invalidate();let me=l.clone().addScaledVector(h,y*(v.length?Pc:1)),he=Math.min(..._.filter(e=>e.kind===`position`).map(e=>e.reach)),ge=i===`universe`&&Number.isFinite(he)?l.clone().addScaledVector(h,he*.85):l.clone(),U=ge.distanceTo(l),_e=[ge.toArray(),me.toArray(),...N.filter(e=>new Y(...e.position).distanceTo(l)>=U).map(e=>e.position)],ve=ge.clone().lerp(me,.5),ye=i===`galaxy`?y:ge.distanceTo(me),be=Math.max(i===`universe`?n*1.08:b,ye*.6),xe=()=>No(_e,jo(h.toArray(),[ve.x,0,ve.z]),{fovDeg:50,aspect:u.aspect,room:[.5,.42],minDistance:be});return{group:C,markers:ee,cone:w,fieldTan:D,basis:c,length:y,labels:M.root,getFramePose:xe,frameCamera(t){e.flyTo(xe(),void 0,t?.zoom??!1)},setOpacity(e,t,n,r){S.setOpacity(e,t,n,r),M.root.style.opacity=String(e)},alignSightLine(e,t,n=t){S.alignSightLine(e,t,n),B?.position.copy(l).addScaledVector(h,y*Pc*E.scale.x)},setConeRoll:S.setConeRoll,placeMarkers(e,t=0){for(let t of N)t.sprite.position.set(...e?.(t.id,t.position)??t.position);if(t!==ne){ne=t;for(let e of N)L(e)}M.invalidate()},setVisible(t){le=t,C.visible=t,M.setVisible(t),t||ce(null),e.invalidate()},setSelected(e){e!==A&&z(()=>{A=e})},setHover:ce,focus(t){let n=se.get(t);if(!n)return;let r=u.position.clone().sub(f.target).normalize(),i=new Y(...n.position);e.flyTo({target:n.position,position:i.addScaledVector(r,Math.max(.15*b,y*.03)).toArray()})},dispose(){e.layout.delete(V),e.claims.delete(de),pe.removeEventListener(`pointermove`,fe),p.style.cursor=``;for(let t of N)e.anchors.delete(t.sprite.position);e.scene.remove(C);for(let e of k)e.dispose();M.dispose(),e.invalidate()}}}function Uc(e,t,n,r,i,a,o,s=!r){let c=D(e=>e.annotationColors),l=(0,X.useRef)(null),u=(0,X.useRef)({handle:null,id:``,scale:null}),d=(0,X.useRef)(r);d.current=r;let f=(0,X.useRef)(o);f.current=o;let p=(0,X.useRef)(t);p.current=t;let m=(0,X.useRef)(a);m.current=a;let h=(0,X.useRef)(i);h.current=i;let g=t?t.cuts.map(e=>[e.id,e.type,e.enabled,e.distLy,e.uncertaintyLy,e.raDeg,e.decDeg,e.x,e.y,e.radius].join(`:`)).join(`|`):``,_=(0,X.useRef)(g);return s||(_.current=g),(0,X.useEffect)(()=>{let t=p.current;if(!e||!t){u.current={handle:null,id:``,scale:null};return}let r=getComputedStyle(document.documentElement).getPropertyValue(`--accent`).trim()||`#00e0ff`,i=Hc(e,t,n,c,r,e=>m.current(e));if(!i)return;l.current=i,i.setVisible(d.current),i.setSelected(h.current);let a=u.current;return(a.handle!==e||a.id!==t.id||a.scale!==n)&&(u.current={handle:e,id:t.id,scale:n},f.current&&i.frameCamera({zoom:a.handle===e&&a.id===t.id})),()=>{i.dispose(),l.current=null}},[e,t?.id,t?.image,_.current,c,n]),(0,X.useEffect)(()=>{l.current?.setVisible(r)},[r]),(0,X.useEffect)(()=>{l.current?.setSelected(i)},[i]),l}var Wc=900,Gc=240,Kc=510,qc=90,Jc=37,Yc=8,Xc=-46,Zc=13,Qc=-9,$c=6.1,el=(e,t)=>getComputedStyle(document.documentElement).getPropertyValue(e).trim()||t,tl=e=>e*e*(3-2*e),nl=e=>e.distLy!==null&&e.distLy<15e4;function rl(e,t,n){let r=document.createElement(`canvas`);r.width=r.height=256;let i=r.getContext(`2d`);i.save(),i.beginPath(),i.arc(128,128,127,0,Math.PI*2),i.clip(),i.fillStyle=`#060b14`,i.fillRect(0,0,256,256),nl(t)&&(i.filter=`brightness(1.45)`);let{x:a,y:o,side:s}=Ya(t,e.naturalWidth,e.naturalHeight);i.drawImage(e,a,o,s,s,0,0,256,256),i.restore(),i.lineWidth=4,i.strokeStyle=n,i.beginPath(),i.arc(128,128,126,0,Math.PI*2),i.stroke();let c=new un(r);return c.colorSpace=Be,c}function il(e,t=!1){let n=document.createElement(`canvas`);n.width=n.height=128;let r=n.getContext(`2d`);return t&&(r.beginPath(),r.arc(64,64,53,0,Math.PI*2),r.strokeStyle=`#060b14`,r.lineWidth=4,r.stroke()),r.beginPath(),r.arc(64,64,52,0,Math.PI*2),r.strokeStyle=e,r.lineWidth=t?2:6,r.stroke(),new un(n)}var al=`
attribute float size;
attribute float alpha;
attribute vec3 tint;
varying vec3 vTint;
varying float vAlpha;
varying float vScale;
uniform float pixelRatio;
uniform float refDistance;
void main() {
  vTint = tint;
  vAlpha = alpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // Z daleka punkty maleją (do 30 %) i tracą poświatę, żeby gęste pola się nie zlewały.
  vScale = clamp(refDistance / max(-mv.z, 1.0), 0.3, 1.0);
  gl_PointSize = max(1.5, size * vScale) * pixelRatio;
}`,ol=`
varying vec3 vTint;
varying float vAlpha;
varying float vScale;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = smoothstep(1.0, 0.0, d);
  float a = pow(core, mix(3.5, 2.2, vScale)) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(vTint, vec3(1.0), pow(core, 6.0)), a);
}`,sl=class{host;options;renderer;scene=new on;camera=new ln(40,1,.1,5e3);controls;labels=document.createElement(`div`);raf=0;dirty=!0;layoutDirty=!0;sizedWidth=0;sizedHeight=0;bufferWidth=0;bufferHeight=0;steadyFrames=0;disposables=[];data=new Ge;dataDisposables=[];photoTexture=null;photoImage=null;earthAssets=null;items=[];visible=new Set;selected=null;progress=1;arrival=1;domain={minLy:10,maxLy:1e4};image={width:1,height:1};photo=null;frame=null;grid;earth=null;lastRender=-1/0;pyramid=null;axisLine=null;tickMaterial=null;fade={earth:1,pyramid:1,axis:1,photo:1,grid:1};external=!1;stars=null;starState=null;starIndex=[];cards=new Map;anchors=new Map;ring;cutPreview;axis=new Ge;ticks=[];itemLabels=new Map;labelWidths=new Map;badges=[];fans=new Map;hovered=null;earthLabel;flight=null;keys=new Set;lastTick=performance.now();resizeObserver;accent;constructor(e,t){this.host=e,this.options=t,this.accent=el(`--accent`,`#00e0ff`),this.renderer=new Ha({antialias:!0,alpha:!0}),this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)),this.renderer.domElement.tabIndex=0,this.renderer.domElement.style.width=`100%`,this.renderer.domElement.style.height=`100%`,this.renderer.domElement.setAttribute(`aria-label`,`Scena 3D obserwatorium: przeciągnij, aby obrócić; klawisze WASD przesuwają kamerę`),e.appendChild(this.renderer.domElement),this.labels.className=`obs-labels`,e.appendChild(this.labels),this.controls=new ks(this.camera,this.renderer.domElement),this.controls.enableDamping=!t.reducedMotion,this.controls.dampingFactor=.12,this.controls.screenSpacePanning=!0,this.controls.addEventListener(`start`,()=>{this.flight=null,this.closeFans()}),this.controls.addEventListener(`change`,()=>{this.dirty=!0});let n=this.grid=new ve(1,24,el(`--border-strong`,`#232942`),el(`--border`,`#15192b`));n.material.transparent=!0,n.scale.set(Gc,1,Kc),n.position.set(0,-62,qc-Kc/2),this.scene.add(n),this.disposables.push(n.geometry,n.material);let r=il(this.accent,!0),i=new kt({map:r,depthTest:!1,depthWrite:!1,transparent:!0,sizeAttenuation:!1});this.ring=new ce(i),this.ring.scale.setScalar(.05),this.ring.renderOrder=10,this.ring.visible=!1;let a=new kt({depthTest:!1,depthWrite:!1,transparent:!0,sizeAttenuation:!1});this.cutPreview=new ce(a),this.cutPreview.scale.setScalar(this.ring.scale.x*.82),this.cutPreview.renderOrder=9,this.cutPreview.visible=!1,this.scene.add(this.ring,this.cutPreview),this.disposables.push(r,i,a),this.scene.add(this.axis,this.data);let o=new Oe(16775406,2.1);o.position.set(12,16,88),o.target.position.set(0,0,70),this.scene.add(new gt(13624575,.65),o,o.target),this.earthLabel=this.label(`obs-label obs-earth`,`Ziemia`);let s={x:0,y:0},c=!1;this.renderer.domElement.addEventListener(`pointerdown`,e=>{s.x=e.clientX,s.y=e.clientY,c=this.fans.size>0,this.closeFans()},!0),this.renderer.domElement.addEventListener(`pointerup`,e=>{!c&&Math.hypot(e.clientX-s.x,e.clientY-s.y)<4&&this.options.onSelect(this.pick(e.clientX,e.clientY))}),this.renderer.domElement.addEventListener(`keydown`,this.onKeyDown),this.renderer.domElement.addEventListener(`keyup`,this.onKeyUp),this.renderer.domElement.addEventListener(`blur`,()=>this.keys.clear()),this.resizeObserver=new ResizeObserver(()=>{!this.external&&this.resize()&&this.render()}),this.resizeObserver.observe(e),this.resize(),this.external=t.external??!1,this.external||this.loop(performance.now())}label(e,t){let n=document.createElement(`div`);return n.className=e,n.textContent=t,this.labels.appendChild(n),n}resize(e=!1){let t=Math.max(1,this.host.clientWidth),n=Math.max(1,this.host.clientHeight),r=t!==this.sizedWidth||n!==this.sizedHeight;return this.steadyFrames=r?0:this.steadyFrames+1,r&&(this.sizedWidth=t,this.sizedHeight=n,this.camera.aspect=t/n,this.camera.updateProjectionMatrix(),this.closeFans(),this.dirty=!0),(t!==this.bufferWidth||n!==this.bufferHeight)&&(!e||this.steadyFrames>=2)?(this.bufferWidth=t,this.bufferHeight=n,this.renderer.setSize(t,n,!1),this.dirty=!0,!0):e&&(t>this.bufferWidth||n>this.bufferHeight)?(t>this.bufferWidth&&(this.bufferWidth=Math.ceil(t*1.25)),n>this.bufferHeight&&(this.bufferHeight=Math.ceil(n*1.25)),this.renderer.setSize(this.bufferWidth,this.bufferHeight,!1),this.dirty=!0,!0):r}ready=!1;setData(e,t,n,r,i=null,a={}){this.clearData(),this.image=t,this.items=n,this.domain=r,this.photoImage!==e&&(this.photoTexture?.dispose(),this.photoTexture=new ke(i??e),i&&(this.photoTexture.flipY=!1),this.photoTexture.colorSpace=Be,this.photoTexture.needsUpdate=!0,this.photoImage=e);let o=this.photoTexture,s=100*t.height/t.width,c=new yt({map:o,transparent:!0,depthWrite:!1,side:2});this.photo=new pt(new ue(100,s),c),this.photo.renderOrder=-1,this.data.add(this.photo);let l=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([e,t])=>new Y(e*100/2,t*s/2,0)),u=new Ie({color:this.accent,transparent:!0,opacity:.55});this.frame=new ht(new tt().setFromPoints(l),u),this.data.add(this.frame),this.dataDisposables.push(c,this.photo.geometry,u,this.frame.geometry);let f=new Y(0,0,70),p=this.earthAssets??=dc(`/`,this.renderer.capabilities.getMaxAnisotropy(),()=>{this.dirty=!0}),m=this.earth=mc(1.5,p),h=m.mesh;h.position.copy(f);let g=new Ie({color:this.accent,transparent:!0,opacity:.35}),_=this.pyramid=new $t(new tt().setFromPoints(l.flatMap(e=>[f,e])),g);this.data.add(h,_),this.dataDisposables.push(...m.disposables,g,_.geometry);let v=new R({color:this.accent,dashSize:2,gapSize:2,transparent:!0,opacity:.7}),y=this.axisLine=new Ye(new tt().setFromPoints([f,new Y(0,0,-400)]),v);y.computeLineDistances(),this.axis.add(y);let b=new nt(1.2,1.6,24),x=this.tickMaterial=new yt({color:this.accent,transparent:!0,opacity:.6,side:2});this.dataDisposables.push(v,y.geometry,b,x);for(let e=Math.round(Math.log10(r.minLy));10**e<=r.maxLy*1.0001;e++){let t=new pt(b,x);this.axis.add(t),this.ticks.push({ly:10**e,mesh:t,label:this.label(`obs-label obs-tick`,I(10**e))})}let S=n.map((e,t)=>[e,t]).filter(([e])=>e.kind===`star`);if(this.starIndex=S.map(([,e])=>e),S.length){let e=new tt,t=Math.max(...S.map(([e])=>e.gMag??0));e.setAttribute(`position`,new bt(new Float32Array(S.length*3),3)),e.setAttribute(`tint`,new bt(new Float32Array(S.flatMap(([e])=>ho(e.bpRp))),3)),e.setAttribute(`size`,new bt(new Float32Array(S.map(([e])=>go(e.gMag,t)*1.8)),1)),e.setAttribute(`alpha`,new bt(new Float32Array(S.length).fill(1),1));let n=new Ue({vertexShader:al,fragmentShader:ol,uniforms:{pixelRatio:{value:this.renderer.getPixelRatio()},refDistance:{value:150}},transparent:!0,depthWrite:!1,blending:2});this.stars=new sn(e,n),this.stars.frustumCulled=!1,this.data.add(this.stars),this.dataDisposables.push(e,n)}let C=new Map;for(let t of n){if(t.kind!==`object`||!t.type)continue;let n=a[t.type]??d[t.type],r=rl(e,t,n),i=new kt({map:r,transparent:!0,depthWrite:!1}),o=new ce(i);if(nl(t)&&(o.renderOrder=1),this.cards.set(t.id,o),this.data.add(o),t.distLy!==null&&Number.isFinite(t.distLy)&&t.distLy>0){let e=C.get(t.type);e||(e=en(t.type,n),C.set(t.type,e),this.dataDisposables.push(e));let r=Mt(e);this.dataDisposables.push(r.material),this.anchors.set(t.id,r),this.data.add(r)}let s=`≈ ${I(t.distLy)}`,c=this.label(`obs-label obs-card`,`${t.id}\n${s}`);c.style.setProperty(`--obs-marker-color`,n),this.itemLabels.set(t.id,c),this.labelWidths.set(t.id,Math.max(t.id.length,s.length)*$c+16),this.dataDisposables.push(r,i)}for(let e of n)this.visible.add(e.id);this.layout(),this.renderer.initTexture(o);for(let e of this.cards.values())e.material.map&&this.renderer.initTexture(e.material.map);for(let e of C.values())this.renderer.initTexture(e);this.ready=!1;let w=++this.dataToken;this.renderer.compileAsync(this.scene,this.camera).catch(()=>{}).then(()=>{w===this.dataToken&&(this.ready=!0,this.dirty=!0)})}dataToken=0;clearData(){this.closeFans();for(let e of this.badges)e.el.remove();this.badges=[],this.labelWidths.clear(),this.data.clear(),this.axis.clear();for(let e of this.dataDisposables)e.dispose();this.dataDisposables=[];for(let e of this.ticks)e.label.remove();for(let e of this.itemLabels.values())e.remove();this.labels.querySelector(`.obs-star`)?.remove(),this.ticks=[],this.itemLabels.clear(),this.cards.clear(),this.cutPreview.visible=!1,this.cutPreview.material.map=null,this.anchors.clear(),this.visible.clear(),this.stars=null,this.starState=null,this.starIndex=[],this.photo=this.frame=this.earth=this.pyramid=this.axisLine=null,this.tickMaterial=null}setProgress(e){let t=Math.max(0,Math.min(1,e));t!==this.progress&&(this.progress=t,this.closeFans(),this.layoutDirty=this.dirty=!0)}setVisible(e){this.visible=e,this.closeFans(),this.layoutDirty=this.dirty=!0}setSelected(e){this.selected=e,this.layoutDirty=this.dirty=!0}position(e){return new Y(...co(e,this.image,e.distLy,this.domain,this.progress))}layout(){this.layoutDirty=!1;let e=tl(this.progress),t=tl(this.arrival),n=this.fade;this.photo&&(this.photo.material.opacity=(1-.82*e*t)*n.photo,this.photo.visible=this.frame.visible=n.photo>0,this.frame.material.opacity=.55*n.photo),this.grid.material.opacity=n.grid,this.grid.visible=n.grid>0,this.earth&&(hc(this.earth.mesh,n.earth),this.earth.mesh.visible=n.earth>0),this.pyramid&&(this.pyramid.material.opacity=.35*n.pyramid,this.pyramid.visible=n.pyramid>0),this.axisLine&&(this.axisLine.material.opacity=.7*n.axis),this.tickMaterial&&(this.tickMaterial.opacity=.6*n.axis);let r=this.starState,i=r?.progress!==this.progress;if(this.stars&&(i||r?.photo!==n.photo||r?.visible!==this.visible)){let t=this.stars.geometry.getAttribute(`position`),r=this.stars.geometry.getAttribute(`alpha`);this.starIndex.forEach((a,o)=>{let s=this.items[a];i&&t.setXYZ(o,...co(s,this.image,s.distLy,this.domain,this.progress)),r.setX(o,this.visible.has(s.id)?(.25+.75*e)*n.photo:0)}),t.needsUpdate||=i,r.needsUpdate=!0,this.starState={progress:this.progress,photo:n.photo,visible:this.visible}}let a=100/this.image.width,o=(1-(this.external?t:e))*n.photo,s=Fc*zc/this.camera.projectionMatrix.elements[5];for(let r of this.items){let i=this.cards.get(r.id);if(!i)continue;let c=Math.min(r.radius*2*a,30),l=this.position(r),u=this.anchors.get(r.id);u&&(u.position.copy(l),u.scale.setScalar(s),u.material.opacity=o,u.visible=this.visible.has(r.id)&&o>0),i.position.copy(l),i.position.z*=t,i.scale.setScalar(c+(Math.min(c,14)-c)*e*t),i.material.opacity=Math.min(1,e*(nl(r)?4:2.5))*tl(Math.min(1,this.arrival*3))*n.photo,i.visible=this.visible.has(r.id)&&e>0&&i.material.opacity>0}for(let t of this.ticks)t.mesh.position.set(0,0,-ao(t.ly,this.domain)*400*e);this.axis.visible=n.axis>0;for(let t of this.ticks)t.mesh.visible=e>.02;let c=this.hovered??this.selected,l=this.items.find(e=>e.id===c);this.ring.material.opacity=n.photo,this.ring.visible=n.photo>0&&!!l&&this.visible.has(l.id),l&&this.ring.position.copy(this.position(l));let u=this.cutPreview,d=this.ring.visible&&l&&(this.hovered!==null||nl(l))?this.cards.get(l.id)?.material.map??null:null;u.visible=d!==null,d&&(u.material.map||(u.material.needsUpdate=!0),u.material.map=d,u.material.opacity=n.photo,u.position.copy(this.ring.position)),this.dirty=!0}pick(e,t){this.layoutDirty&&this.layout();let n=this.renderer.domElement.getBoundingClientRect(),r=new Y,i=null,a=1;for(let o of this.items){if(!this.visible.has(o.id)||(r.copy(this.position(o)).project(this.camera),r.z>1))continue;let s=Math.hypot((r.x+1)/2*n.width-(e-n.left),(1-r.y)/2*n.height-(t-n.top)),c=this.cards.get(o.id),l=s/(c?Math.max(12,this.screenRadius(c)):12);l<a&&(i=o.id,a=l)}return i}screenRadius(e){let t=this.camera.position.distanceTo(e.position);return e.scale.x/2/(2*t*Math.tan(dt.degToRad(40)/2))*this.renderer.domElement.clientHeight}bounds(e=!0){let t=new Ft,n=100*this.image.height/this.image.width;t.expandByPoint(new Y(-50,-n/2,0)).expandByPoint(new Y(50,n/2,0)),e&&t.expandByPoint(new Y(0,0,70));for(let e of this.items)this.visible.has(e.id)&&e.distLy!==null&&t.expandByPoint(new Y(...co(e,this.image,e.distLy,this.domain,1)));return t}fitDistance(e,t){return yo(e,t,this.camera.aspect)}setView(e,t=!0){let n=this.viewPose(e);this.fly(new Y(...n.position),new Y(...n.target),t,n.fov??40)}viewPose(e){if(e===`earth`)return bo(this.image,this.camera.aspect);if(e===`structure`)return xo(this.items.filter(e=>this.visible.has(e.id)),this.image,this.domain);let t=this.bounds(!0),n=t.getCenter(new Y),r=t.getSize(new Y);return e===`top`?{target:n.toArray(),position:n.clone().add(new Y(0,this.fitDistance(r.x,r.z)+r.y/2,.001)).toArray()}:{target:n.toArray(),position:n.clone().add(new Y(this.fitDistance(r.z,r.y)+r.x/2,0,0)).toArray()}}screenPoint(e){let t=new Y(...e).project(this.camera);return[(t.x+1)/2*this.renderer.domElement.clientWidth,(1-t.y)/2*this.renderer.domElement.clientHeight]}get aspect(){return this.camera.aspect}getProgress(){return this.progress}getPose(){return{position:this.camera.position.toArray(),target:this.controls.target.toArray(),fov:this.camera.fov}}setPose(e,t,n=[0,1,0],r=40){this.flight=null,this.camera.up.set(...n),this.setFov(r),this.camera.position.set(...e),this.controls.target.set(...t),this.camera.lookAt(this.controls.target),this.dirty=!0}setFov(e){e!==this.camera.fov&&(this.camera.fov=e,this.camera.updateProjectionMatrix(),this.layoutDirty=!0)}setFade(e,t=1,n=1){this.arrival=t;let r=Kc*n;this.grid.scale.set(Gc*Math.sqrt(n),1,r),this.grid.position.z=qc-r/2,this.fade={...this.fade,...e},this.layoutDirty=this.dirty=!0}setInteractive(e){e||this.closeFans(),this.labels.classList.toggle(`inert`,!e),this.controls.enabled=e,this.renderer.domElement.style.pointerEvents=e?``:`none`}setExternal(e){e!==this.external&&(this.external=e,this.closeFans(),cancelAnimationFrame(this.raf),this.layoutDirty=this.dirty=!0,e||(this.camera.up.set(0,1,0),this.setFov(40),this.raf=requestAnimationFrame(this.loop)))}get frames(){return this.renderer.info.render.frame}flyTo(e){let t=this.items.find(t=>t.id===e);if(!t)return;let n=this.position(t),r=this.camera.position.clone().sub(this.controls.target).normalize();this.fly(n.clone().add(r.multiplyScalar(45)),n,!0)}fly(e,t,n,r=this.camera.fov){if(this.closeFans(),!n||this.options.reducedMotion)return this.flight?.resolve?.(),this.flight=null,this.setFov(r),this.camera.position.copy(e),this.controls.target.copy(t),this.controls.update(),this.dirty=!0,Promise.resolve();let i=this.camera.position.clone(),a=this.controls.target.clone(),o=this.controls.enableDamping;return this.controls.enableDamping=!1,this.controls.update(),this.controls.enableDamping=o,this.camera.position.copy(i),this.controls.target.copy(a),new Promise(n=>{this.flight?.resolve?.();let o=(e,t)=>e.clone().sub(t).toArray([0,0,0]);this.flight={offset:[o(i,a),o(e,t)],target:[a,t],fov:[this.camera.fov,r],t0:null,resolve:n}})}onKeyDown=e=>{![`KeyW`,`KeyA`,`KeyS`,`KeyD`,`ArrowUp`,`ArrowLeft`,`ArrowDown`,`ArrowRight`].includes(e.code)||e.altKey||e.ctrlKey||e.metaKey||(e.preventDefault(),this.flight=null,this.closeFans(),this.keys.add(e.code))};onKeyUp=e=>{this.keys.delete(e.code)};loop=e=>{this.raf=requestAnimationFrame(this.loop),this.step(e)};step(e,t){this.resize(this.external);let n=this.earth,r=n?.mesh.visible&&!this.options.reducedMotion;r&&n.spin(e);let i=r&&e-this.lastRender>=33.333333333333336;if(this.external){if((this.dirty||t||i)&&this.render(e,this.dirty||!!t),t){let e=this.renderer.autoClear;this.renderer.autoClear=!1;try{this.renderer.render(t.object,t.camera)}finally{this.renderer.autoClear=e}}return}let a=Math.min(Math.max(0,e-this.lastTick)/1e3,.05);if(this.lastTick=e,this.flight){this.flight.t0??=e;let t=Math.min(1,Math.max(0,e-this.flight.t0)/Wc),n=1-(1-t)**3;this.controls.target.lerpVectors(this.flight.target[0],this.flight.target[1],n),this.camera.position.set(...lo(this.flight.offset[0],this.flight.offset[1],n)).add(this.controls.target),this.setFov(dt.lerp(...this.flight.fov,n)),this.dirty=!0,t>=1&&(this.flight.resolve?.(),this.flight=null)}if(this.keys.size){let e=this.camera.getWorldDirection(new Y),t=new Y(1,0,0).applyQuaternion(this.camera.quaternion),n=new Y;(this.keys.has(`KeyW`)||this.keys.has(`ArrowUp`))&&n.add(e),(this.keys.has(`KeyS`)||this.keys.has(`ArrowDown`))&&n.sub(e),(this.keys.has(`KeyD`)||this.keys.has(`ArrowRight`))&&n.add(t),(this.keys.has(`KeyA`)||this.keys.has(`ArrowLeft`))&&n.sub(t),n.lengthSq()&&(n.normalize().multiplyScalar(Math.max(this.camera.position.distanceTo(this.controls.target)*.6,5)*a),this.camera.position.add(n),this.controls.target.add(n),this.dirty=!0)}let o=this.controls.update()||this.dirty;(o||i)&&this.render(e,o)}render(e=performance.now(),t=!0){this.layoutDirty&&this.layout(),this.dirty=!1,this.lastRender=e,this.renderer.render(this.scene,this.camera),t&&this.placeLabels()}placeLabels(){let e=this.renderer.domElement.clientWidth,t=this.renderer.domElement.clientHeight,n=new Y,r=(r,i,a)=>{n.copy(i).project(this.camera);let o=a&&n.z<1&&Math.abs(n.x)<1.2&&Math.abs(n.y)<1.2;if(r.style.display=o?``:`none`,!o)return null;let s=(n.x+1)/2*e,c=(1-n.y)/2*t;return r.style.transform=`translate(${s.toFixed(1)}px, ${c.toFixed(1)}px)`,[s,c]},i=tl(this.progress);this.earthLabel.style.opacity=String(this.fade.earth),this.labels.style.setProperty(`--obs-photo-fade`,String(this.fade.photo)),r(this.earthLabel,new Y(0,-4.5,70),this.fade.earth>0);for(let e of this.ticks)e.label.style.opacity=String(this.fade.axis),r(e.label,e.mesh.position,i>.3&&this.fade.axis>0);let a=[],o=[];for(let e of this.items){let t=this.itemLabels.get(e.id),n=e.id===this.selected;if(!t)continue;let i=this.cards.get(e.id);t.classList.toggle(`selected`,n);let s=this.anchors.get(e.id),c=s?.visible===!0;t.classList.toggle(`space-photo-label`,c);let l=r(t,c?s.position:i.position.clone().add(new Y(0,i.scale.y/2,0)),this.visible.has(e.id));if(!l)continue;let u=l[0]+(c?Zc:Yc),d=l[1]+(c?Qc:Xc);a.push({item:e,el:t,x:l[0],y:l[1]}),o.push({left:u,top:d,right:u+(this.labelWidths.get(e.id)??0),bottom:d+Jc})}let s=Hs(o).filter(e=>e.length>1).map(e=>{let t=e.map(e=>a[e]),n=t.map(({item:e})=>e.id);return{members:t,ids:n,key:JSON.stringify(n)}}),c=new Map(this.badges.map(e=>[e.key,e])),l=new Set(s.map(({key:e})=>e)),u=this.badges.filter(e=>!l.has(e.key));for(let e of u)this.fans.get(e)?.close(),e.el.style.display=`none`,e.key=``;for(let{members:e,ids:t,key:n}of s){for(let{item:t,el:n}of e)t.id!==this.selected&&(n.style.display=`none`);let r=c.get(n)??u.pop()??this.createBadge(),i=e.map(({item:e})=>e.distLy).filter(e=>e!==null),a=`${Ys(e.length)}\n${i.length?ie(Math.min(...i),Math.max(...i)):``}`;a!==r.text&&(r.el.textContent=r.text=a),r.ids=t,r.key=n,r.x=e.reduce((e,t)=>e+t.x,0)/e.length,r.y=e.reduce((e,t)=>e+t.y,0)/e.length,r.el.style.display=``,r.el.style.transform=`translate(${r.x.toFixed(1)}px, ${(r.y+Xc+Jc).toFixed(1)}px) translate(-50%, -100%)`}for(let e of this.fans.values())e.setSelected(this.selected);let d=this.labels.querySelector(`.obs-star`),f=this.items.find(e=>e.id===this.selected&&e.kind===`star`);f?(d??=this.label(`obs-label obs-card obs-star selected`,``),d.textContent=`${f.id.replace(`Gaia DR3 `,`Gaia `)}\n≈ ${I(f.distLy)}`,r(d,this.position(f),this.visible.has(f.id))):d&&(d.style.display=`none`)}createBadge(){let e=document.createElement(`button`);e.type=`button`,e.className=`obs-label obs-group`,e.title=`Pokaż obiekty grupy`,e.setAttribute(`aria-expanded`,`false`);let t={el:e,text:``,ids:[],key:``,x:0,y:0};return e.addEventListener(`click`,()=>this.toggleFan(t)),this.labels.appendChild(e),this.badges.push(t),t}toggleFan(e){let t=this.fans.get(e);if(t){t.close();return}let{ids:n,x:r,y:i,el:a}=e,o=this.photoImage?.src,{width:s,height:c}=this.image,l=this.items.filter(e=>n.includes(e.id)).sort(mo).map(e=>({id:e.id,text:`${e.id} · ${I(e.distLy)}`,cutout:o&&e.kind===`object`?{image:o,width:s,height:c,x:e.x,y:e.y,radius:e.radius}:void 0})),u=Zs(this.labels,l,r,i,this.sizedWidth,this.sizedHeight,{hover:e=>{this.hovered=e,this.layoutDirty=this.dirty=!0},pick:e=>this.options.onSelect(e),closed:()=>{this.fans.delete(e),a.setAttribute(`aria-expanded`,`false`),a.title=`Pokaż obiekty grupy`,this.layoutDirty=this.dirty=!0}});this.fans.set(e,u),a.setAttribute(`aria-expanded`,`true`),a.title=`Zwiń listę obiektów`,u.setSelected(this.selected),this.dirty=!0}closeFans(){for(let e of this.fans.values())e.close()}dispose(){cancelAnimationFrame(this.raf),this.clearData(),this.photoTexture?.dispose(),this.earthAssets?.dispose(),this.resizeObserver.disconnect(),this.controls.dispose();for(let e of this.disposables)e.dispose();this.renderer.dispose(),this.renderer.forceContextLoss(),this.renderer.domElement.remove(),this.labels.remove()}},cl=[{id:`structure`,label:`Struktura`},{id:`earth`,label:`Z Ziemi`},{id:`top`,label:`Z góry`},{id:`side`,label:`Z boku`}],ll=()=>matchMedia(`(prefers-reduced-motion: reduce)`).matches,ul=2048;function dl(e,t){let n=document.createElement(`canvas`);n.width=n.height=96;let r=t.kind===`star`?Math.max(24,e.naturalWidth*.012):t.radius,{x:i,y:a,side:o}=Ya({x:t.x,y:t.y,radius:r},e.naturalWidth,e.naturalHeight);return n.getContext(`2d`).drawImage(e,i,a,o,o,0,0,96,96),n.toDataURL(`image/jpeg`,.85)}function fl({project:e,slots:t,stars:n,onRetryStars:r,diving:i,hidden:a,onScene:o}){let s=D(e=>e.annotationColors),c=(0,X.useRef)(null),l=(0,X.useRef)(null),[u,d]=(0,X.useState)(null),[f,m]=(0,X.useState)(null),[h,g]=(0,X.useState)(1),[_,b]=(0,X.useState)(!1),[x,S]=(0,X.useState)(`structure`),[C,w]=(0,X.useState)(`all`),[T,E]=(0,X.useState)(null),[O,k]=(0,X.useState)(null),[ee,A]=(0,X.useState)(``),[j,M]=(0,X.useState)(!1),N=(0,X.useMemo)(()=>ro(e),[e]),te=(0,X.useMemo)(()=>io(N.map(e=>e.distLy)),[N]),P=(0,X.useMemo)(()=>N.filter(e=>fo(e,{category:C,range:T})),[N,C,T]),F=(0,X.useMemo)(()=>N.filter(e=>fo(e,{category:C,range:null})),[N,C]),re=(0,X.useMemo)(()=>uo(F.map(e=>e.distLy),te),[F,te]),ie=(0,X.useMemo)(()=>po(N),[N]),L=(0,X.useMemo)(()=>{let e=ee.trim().toLowerCase(),t=P.filter(t=>!e||t.id.toLowerCase().includes(e)).sort(mo);return j?t.reverse():t},[P,ee,j]),oe=P,R=N.find(e=>e.id===O)??null,se=vo(e.astrometry.wcs,e.width,e.height),z=(0,X.useMemo)(()=>u&&R?dl(u,R):null,[u,R]);(0,X.useEffect)(()=>{let t=!0,n=new Image;return n.src=e.image,n.decode().catch(()=>{}).then(async()=>{let r=Math.min(1,ul/Math.max(n.naturalWidth,n.naturalHeight)),i=await fetch(e.image).then(e=>e.blob()).catch(()=>null),a=await createImageBitmap(i??n,{resizeWidth:Math.max(1,Math.round(n.naturalWidth*r)),resizeHeight:Math.max(1,Math.round(n.naturalHeight*r)),resizeQuality:`high`,imageOrientation:`flipY`}).catch(()=>null);t?(m(a),d(n)):a?.close()}),()=>{t=!1}},[e.image]),(0,X.useEffect)(()=>()=>f?.close(),[f]);let ce=(0,X.useRef)(i||a);ce.current=i||a;let B=(0,X.useRef)(o);B.current=o,(0,X.useLayoutEffect)(()=>()=>{B.current?.(null),l.current?.dispose(),l.current=null},[]),(0,X.useEffect)(()=>{u&&c.current&&(l.current??=new sl(c.current,{reducedMotion:ll(),onSelect:k,external:ce.current}),l.current.setData(u,{width:e.width,height:e.height},N,te,f,s),B.current?.(l.current))},[u,f,N,te,e.width,e.height,s]),(0,X.useEffect)(()=>{l.current?.setProgress(h)},[h,u,N]),(0,X.useEffect)(()=>{l.current?.setVisible(new Set(P.map(e=>e.id)))},[P,u,s]),(0,X.useEffect)(()=>{l.current?.setSelected(O)},[O,u,N]);let V=(0,X.useRef)(x);(0,X.useEffect)(()=>{l.current?.setView(V.current,!1)},[u,N]),(0,X.useEffect)(()=>{V.current!==x&&(V.current=x,l.current?.setView(x))},[x]),(0,X.useEffect)(()=>{if(!_)return;let e=0,t=performance.now(),n=r=>{let i=Math.min(r-t,100);t=r,g(e=>Math.min(1,e+i/$a)),e=requestAnimationFrame(n)};return e=requestAnimationFrame(n),()=>cancelAnimationFrame(e)},[_]),(0,X.useEffect)(()=>{h>=1&&b(!1)},[h]),(0,X.useEffect)(()=>{i||a?(b(!1),V.current=`structure`,S(`structure`)):g(l.current?.getProgress()??1)},[i,a]);function le(){ll()?g(1):(h>=1&&g(0),b(e=>!e))}let H=oe.length?[Math.min(...oe.map(e=>e.distLy)),Math.max(...oe.map(e=>e.distLy))]:null,ue=e.cuts.filter(e=>e.enabled&&!p(e)).length+(e.stars?.stars.filter(e=>e.distLy===null).length??0);return(0,Z.jsxs)(Z.Fragment,{children:[t.summary&&(0,Tn.createPortal)((0,Z.jsxs)(Z.Fragment,{children:[H?(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`strong`,{children:[`Obiekty w 3D: `,oe.length]}),(0,Z.jsxs)(`span`,{children:[I(H[0]),` — `,I(H[1])]})]}):(0,Z.jsx)(`strong`,{children:`Brak obiektów z odległością w tej grupie`}),n.status===`loading`&&(0,Z.jsx)(`span`,{className:`accent`,children:`Pobieranie gwiazd Gaia DR3…`})]}),t.summary),t.toolbar&&(0,Tn.createPortal)((0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(`select`,{className:`control`,"aria-label":`Grupa obiektów`,value:C,onChange:e=>w(e.target.value),children:Object.keys(eo).map(e=>(0,Z.jsxs)(`option`,{value:e,children:[eo[e],` (`,ie[e],`)`]},e))}),(0,Z.jsx)(`div`,{className:`obs-tabs`,role:`tablist`,"aria-label":`Widok kamery`,children:cl.map(e=>(0,Z.jsx)(`button`,{type:`button`,role:`tab`,"aria-selected":x===e.id,className:`toggle-chip${x===e.id?` on`:``}`,title:x===e.id?`Kliknij ponownie, aby dopasować widok`:void 0,onClick:()=>{x===e.id?l.current?.setView(e.id):S(e.id)},children:e.label},e.id))})]}),t.toolbar),(0,Tn.createPortal)((0,Z.jsxs)(`div`,{className:`obs-layer${a?` is-hidden`:``}`,children:[(0,Z.jsx)(`div`,{ref:c,className:`obs-canvas`}),(0,Z.jsxs)(`div`,{className:`obs-stage-title`,children:[(0,Z.jsx)(`strong`,{children:h<.02?`Zdjęcie na niebie`:`Wewnątrz kadru`}),(0,Z.jsx)(`span`,{className:`faint`,children:h<.02?`Widok przejściowy · dokładne położenia przy 100%`:`Perspektywa · oś odległości logarytmiczna, dekady na osi`})]}),x===`earth`&&se&&(0,Z.jsxs)(`div`,{className:`obs-fov figures`,children:[`Pole `,ae(se.widthDeg,2),`° × `,ae(se.heightDeg,2),`° ≈ `,ae(se.moons,1),` tarczy Księżyca`]}),!oe.length&&(0,Z.jsxs)(`div`,{className:`obs-empty`,role:`status`,children:[`Brak obiektów z odległością w tym przedziale lub grupie.`,(0,Z.jsx)(`br`,{}),`Poszerz zakres albo wybierz inną grupę obiektów.`]}),n.status===`error`&&(0,Z.jsxs)(`div`,{className:`obs-error photo-error`,role:`alert`,children:[n.message,(0,Z.jsx)(`button`,{type:`button`,className:`button small`,onClick:r,children:`Ponów`})]}),(0,Z.jsxs)(`div`,{className:`obs-reference`,children:[(0,Z.jsx)(`span`,{className:`label`,children:`Zdjęcie źródłowe`}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`img`,{src:e.image,alt:``,decoding:`async`}),R&&(0,Z.jsx)(`span`,{className:`obs-crosshair`,style:{left:`${R.x/e.width*100}%`,top:`${R.y/e.height*100}%`}})]})]}),(0,Z.jsx)(`div`,{className:`obs-hint faint`,children:`Przeciągnij: obrót · prawy przycisk: przesunięcie · kółko: przybliżenie · WASD: ruch`})]}),t.stage),(0,Z.jsxs)(`aside`,{className:`obs-aside`,children:[(0,Z.jsxs)(`section`,{className:`obs-inspector`,"aria-live":`polite`,children:[(0,Z.jsx)(`span`,{className:`label`,children:`Inspektor obiektu`}),(0,Z.jsxs)(`div`,{className:`obs-inspector-head`,children:[z?(0,Z.jsx)(`img`,{src:z,alt:``}):(0,Z.jsx)(`span`,{className:`obs-thumb-empty`}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`strong`,{children:R?R.id:`Wybierz obiekt`}),(0,Z.jsx)(`span`,{className:`dim`,children:R?`${gs(R)} · ${R.kind===`star`?`Gaia DR3`:`zakres: ${y[R.scope]}`}`:`Kliknij w scenie lub na liście`})]})]}),(0,Z.jsx)(`span`,{className:`label`,children:`Odległość od Ziemi`}),(0,Z.jsx)(`div`,{className:`obs-distance figures`,children:R?I(R.distLy):`—`}),R&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`div`,{className:`dim figures`,children:[`RA `,ae(R.raDeg,5),`° · Dec `,ae(R.decDeg,5),`°`,(0,Z.jsx)(`br`,{}),R.kind===`star`?`równikowe ICRS · epoka 2025,0`:`równikowe J2000`]}),R.distLy!==null&&R.distLoLy!==null&&R.distHiLy!==null&&(0,Z.jsxs)(`div`,{className:`dim figures`,children:[`Niepewność głębi −`,I(R.distLy-R.distLoLy),` / +`,I(R.distHiLy-R.distLy)]}),(0,Z.jsx)(`button`,{type:`button`,className:`button small`,onClick:()=>l.current?.flyTo(R.id),children:`Leć do zaznaczenia`}),(0,Z.jsxs)(`details`,{children:[(0,Z.jsx)(`summary`,{children:`Źródło i niepewność`}),(0,Z.jsxs)(`p`,{children:[[R.method,R.source].filter(Boolean).join(` · `),R.ref&&(0,Z.jsxs)(Z.Fragment,{children:[` · `,(0,Z.jsx)(`a`,{href:v(R.ref),target:`_blank`,rel:`noreferrer`,children:`ADS ↗`})]})]}),R.kind===`star`&&(0,Z.jsxs)(`p`,{className:`figures`,children:[`G = `,ae(R.gMag??0,2),R.bpRp!==null&&` · BP−RP = ${ae(R.bpRp,2)}`,R.parallaxOverError!==null&&` · ϖ/σ = ${ae(R.parallaxOverError,1)}`,(0,Z.jsx)(`br`,{}),`Odległość podajemy przy ϖ/σ ≥ 5; przedział to 16. i 84. percentyl.`]})]})]})]}),(0,Z.jsx)(`input`,{className:`control`,type:`search`,placeholder:`Znajdź obiekt…`,"aria-label":`Znajdź obiekt`,value:ee,onChange:e=>A(e.target.value)}),(0,Z.jsx)(vs,{items:L,revealStars:C===`stars`||!!ee.trim(),selected:O,onSelect:k,descending:j,onSort:()=>M(e=>!e)},e.id),(0,Z.jsxs)(`div`,{className:`faint figures`,children:[`W 3D: `,oe.length,ue>0&&` · pominięte bez odległości: ${ue}`]})]}),(0,Z.jsx)(ms,{histogram:re,domain:te,range:T,onRange:E,marker:R?.distLy??null}),(0,Z.jsxs)(`div`,{className:`obs-bottom`,children:[(0,Z.jsxs)(`div`,{className:`obs-timeline`,children:[(0,Z.jsx)(`button`,{type:`button`,className:`button small icon-button`,"aria-label":_?`Wstrzymaj rozkładanie`:`Rozłóż zdjęcie`,title:_?`Wstrzymaj rozkładanie`:`Rozłóż zdjęcie`,onClick:le,children:_?(0,Z.jsx)(Gt,{size:14}):(0,Z.jsx)(vt,{size:14})}),(0,Z.jsx)(`button`,{type:`button`,className:`button small icon-button${h===0?` active`:``}`,"aria-pressed":h===0,"aria-label":`Początek: płaskie zdjęcie (0%)`,title:`Początek: płaskie zdjęcie (0%)`,onClick:()=>{b(!1),g(0)},children:(0,Z.jsx)(vn,{size:14})}),(0,Z.jsx)(`button`,{type:`button`,className:`button small icon-button${h===1?` active`:``}`,"aria-pressed":h===1,"aria-label":`Koniec: pełna głębia z odległości (100%)`,title:`Koniec: pełna głębia z odległości (100%)`,onClick:()=>{b(!1),g(1)},children:(0,Z.jsx)(bn,{size:14})}),(0,Z.jsx)(ne,{"aria-label":`Rozłożenie zdjęcia w głąb`,min:0,max:1,step:.001,value:h,onChange:e=>{b(!1),g(Number(e.target.value))}}),(0,Z.jsxs)(`span`,{className:`figures obs-percent`,children:[Math.round(h*100),`%`]})]}),(0,Z.jsxs)(`div`,{className:`obs-legend`,children:[(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`span`,{className:`obs-marker stars`}),`Gwiazdy`]}),(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`span`,{className:`obs-marker galaxies`}),`Galaktyki`]}),(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`span`,{className:`obs-marker nebulae`}),`Mgławice i gromady`]}),(0,Z.jsx)(`span`,{className:`obs-spacer`}),(0,Z.jsx)(`span`,{className:`faint`,children:`Gwiazdy: ESA/Gaia/DPAC (DR3, CC BY-NC 3.0 IGO), odległości Bailer-Jones i in. 2021 (CC BY 4.0) przy ϖ/σ ≥ 5 · pokazujemy tylko obiekty z ustaloną odległością`})]})]})]})}var pl=new Ft,ml=new Y,hl=class extends U{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type=`LineSegmentsGeometry`,this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute(`position`,new Re([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute(`uv`,new Re([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Ce(t,6,1);return this.setAttribute(`instanceStart`,new W(n,3,0)),this.setAttribute(`instanceEnd`,new W(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Ce(t,6,1);return this.setAttribute(`instanceColorStart`,new W(n,3,0)),this.setAttribute(`instanceColorEnd`,new W(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Le(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ft);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),pl.setFromBufferAttribute(t),this.boundingBox.union(pl))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new fe),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)ml.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(ml)),ml.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(ml));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error(`THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.`,this)}}toJSON(){}};$.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new G},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}},On.line={uniforms:we.merge([$.common,$.fog,$.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		float trimSegmentAlpha( const in vec4 start, const in vec4 end ) {

			// compute the interpolation factor needed to trim the segment so it terminates
			// between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column

			// we need different nearEstimate formula for reversed and default depth buffer
			// a is positive with a reversed depth buffer so it can be used for controlling the code flow
			float nearEstimate = ( a > 0.0 ) ? ( - b / ( a + 1.0 ) ) : ( - 0.5 * b / a );

			return ( nearEstimate - start.z ) / ( end.z - start.z );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef USE_DASH

				float lineDistanceStart = dashScale * instanceDistanceStart;
				float lineDistanceEnd = dashScale * instanceDistanceEnd;

			#endif

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( start, end );
					end.xyz = mix( start.xyz, end.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceEnd = mix( lineDistanceStart, lineDistanceEnd, alpha );

					#endif

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( end, start );
					start.xyz = mix( end.xyz, start.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceStart = mix( lineDistanceEnd, lineDistanceStart, alpha );

					#endif

				}

			}

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? lineDistanceStart : lineDistanceEnd;
				vUv = uv;

			#endif

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};var gl=class extends Ue{constructor(e){super({type:`LineMaterial`,uniforms:we.clone(On.line.uniforms),vertexShader:On.line.vertexShader,fragmentShader:On.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return`WORLD_UNITS`in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS=``:delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return`USE_DASH`in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH=``:delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return`USE_ALPHA_TO_COVERAGE`in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE=``:delete this.defines.USE_ALPHA_TO_COVERAGE)}},_l=new Se,vl=new Y,yl=new Y,bl=new Se,xl=new Se,Sl=new Se,Cl=new Y,wl=new nn,Tl=new $e,El=new Y,Dl=new Ft,Ol=new fe,kl=new Se,Al,jl;function Ml(e,t,n){return kl.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),kl.multiplyScalar(1/kl.w),kl.x=jl/n.width,kl.y=jl/n.height,kl.applyMatrix4(e.projectionMatrixInverse),kl.multiplyScalar(1/kl.w),Math.abs(Math.max(kl.x,kl.y))}function Nl(e,t){let n=e.matrixWorld,r=e.geometry,i=r.attributes.instanceStart,a=r.attributes.instanceEnd,o=Math.min(r.instanceCount,i.count);for(let r=0,s=o;r<s;r++){Tl.start.fromBufferAttribute(i,r),Tl.end.fromBufferAttribute(a,r),Tl.applyMatrix4(n);let o=new Y,s=new Y;Al.distanceSqToSegment(Tl.start,Tl.end,s,o),s.distanceTo(o)<jl*.5&&t.push({point:s,pointOnLine:o,distance:Al.origin.distanceTo(s),object:e,face:null,faceIndex:r,uv:null,uv1:null})}}function Pl(e,t,n){let r=t.projectionMatrix,i=e.material.resolution,a=e.matrixWorld,o=e.geometry,s=o.attributes.instanceStart,c=o.attributes.instanceEnd,l=Math.min(o.instanceCount,s.count),u=-t.near;Al.at(1,Sl),Sl.w=1,Sl.applyMatrix4(t.matrixWorldInverse),Sl.applyMatrix4(r),Sl.multiplyScalar(1/Sl.w),Sl.x*=i.x/2,Sl.y*=i.y/2,Sl.z=0,Cl.copy(Sl),wl.multiplyMatrices(t.matrixWorldInverse,a);for(let t=0,o=l;t<o;t++){if(bl.fromBufferAttribute(s,t),xl.fromBufferAttribute(c,t),bl.w=1,xl.w=1,bl.applyMatrix4(wl),xl.applyMatrix4(wl),bl.z>u&&xl.z>u)continue;if(bl.z>u){let e=bl.z-xl.z,t=(bl.z-u)/e;bl.lerp(xl,t)}else if(xl.z>u){let e=xl.z-bl.z,t=(xl.z-u)/e;xl.lerp(bl,t)}bl.applyMatrix4(r),xl.applyMatrix4(r),bl.multiplyScalar(1/bl.w),xl.multiplyScalar(1/xl.w),bl.x*=i.x/2,bl.y*=i.y/2,xl.x*=i.x/2,xl.y*=i.y/2,Tl.start.copy(bl),Tl.start.z=0,Tl.end.copy(xl),Tl.end.z=0;let o=Tl.closestPointToPointParameter(Cl,!0);Tl.at(o,El);let l=dt.lerp(bl.z,xl.z,o),d=l>=-1&&l<=1,f=Cl.distanceTo(El)<jl*.5;if(d&&f){Tl.start.fromBufferAttribute(s,t),Tl.end.fromBufferAttribute(c,t),Tl.start.applyMatrix4(a),Tl.end.applyMatrix4(a);let r=new Y,i=new Y;Al.distanceSqToSegment(Tl.start,Tl.end,i,r),n.push({point:i,pointOnLine:r,distance:Al.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,uv1:null})}}}var Fl=class extends pt{constructor(e=new hl,t=new gl({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type=`LineSegments2`}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)vl.fromBufferAttribute(t,e),yl.fromBufferAttribute(n,e),r[i]=i===0?0:r[i-1],r[i+1]=r[i]+vl.distanceTo(yl);let i=new Ce(r,2,1);return e.setAttribute(`instanceDistanceStart`,new W(i,1,0)),e.setAttribute(`instanceDistanceEnd`,new W(i,1,1)),this}raycast(e,t){let n=this.material.worldUnits,r=e.camera;if(r===null&&!n&&console.error(`LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.`),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let i=e.params.Line2===void 0?0:e.params.Line2.threshold||0;Al=e.ray;let a=this.matrixWorld,o=this.geometry,s=this.material;jl=s.linewidth+i,o.boundingSphere===null&&o.computeBoundingSphere(),Ol.copy(o.boundingSphere).applyMatrix4(a);let c;if(c=n?jl*.5:Ml(r,Math.max(r.near,Ol.distanceToPoint(Al.origin)),s.resolution),Ol.radius+=c,Al.intersectsSphere(Ol)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),Dl.copy(o.boundingBox).applyMatrix4(a);let l;l=n?jl*.5:Ml(r,Math.max(r.near,Dl.distanceToPoint(Al.origin)),s.resolution),Dl.expandByScalar(l),Al.intersectsBox(Dl)!==!1&&(n?Nl(this,t):Pl(this,r,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(_l),this.material.uniforms.resolution.value.set(_l.z,_l.w))}},Il=1e5,Ll={"M 31":{kind:`spiral`,label:`Sb - spiralna, duże zgrubienie i pierścień`,axisRatio:1,core:.28,bar:!0},"M 33":{kind:`flocculent`,label:`Scd - spiralna, luźne i poszarpane ramiona`,axisRatio:1,core:.03},"ESO 56-115":{kind:`irregular`,label:`SBm - Magellanowa, poprzeczka i obszary gwiazdotwórcze`,axisRatio:.85,core:0,bar:!0,barPa:121,barLength:46,knots:8},"M 32":{kind:`elliptical`,label:`cE2 - zwarta eliptyczna`,axisRatio:.8,core:.65},"M 110":{kind:`elliptical`,label:`dE5 - karłowata eliptyczna`,axisRatio:.5,core:.12},"NGC 147":{kind:`elliptical`,label:`dE5 - rozproszona eliptyczna`,axisRatio:.5,core:0},"NGC 185":{kind:`elliptical`,label:`dE3 - karłowata eliptyczna`,axisRatio:.7,core:.2},"NGC 292":{kind:`irregular`,label:`SMC - nieregularna, poprzeczka i skrzydło`,axisRatio:.5,core:0,bar:!0,knots:7},"NGC 6822":{kind:`irregular`,label:`IBm - nieregularna z poprzeczką`,axisRatio:.7,core:0,bar:!0,knots:6},"IC 10":{kind:`irregular`,label:`dIrr - nieregularna, intensywne tworzenie gwiazd`,axisRatio:.8,core:0,knots:16},"IC 1613":{kind:`irregular`,label:`dIrr - rozproszona nieregularna`,axisRatio:.8,core:0,knots:5}},Rl=e=>new Y(...T(e));function zl(e,t){return new Y(...f(e,t))}var Bl=new Map;function Vl(e,t){let n=Bl.get(e);return n||Bl.set(e,n=t()),n}function Hl(e,t){let{pos:n,col:r}=Vl(`mw:${e}`,()=>Gl(e)),i=new tt;i.setAttribute(`position`,new bt(n,3)),i.setAttribute(`color`,new bt(r,3));let a=Kl(t);return new sn(i,a)}function Ul(e,t){return Math.log(e/4)/Math.tan(12*Math.PI/180)+t*Math.PI/2}var Wl=[{name:`Centrum Galaktyki`,anchor:new Y},...[[`Ramię Perseusza`,34,0],[`Ramię Strzelca–Kila`,21,1],[`Ramię Tarczy–Centaura`,16,2],[`Ramię Zewnętrzne`,44,3]].map(([e,t,n])=>{let r=Ul(t,n);return{name:e,anchor:Rl([t*Math.cos(r),t*Math.sin(r),0])}}),{name:`Ramię Lokalne (Oriona)`,anchor:Rl([-26.7,5,0])}];function Gl(e){let t=new Float32Array(e*3),n=new Float32Array(e*3),r=(()=>{let e=7;return()=>(e=e*16807%2147483647)/2147483647})(),i=()=>Math.sqrt(-2*Math.log(r()+1e-9))*Math.cos(2*Math.PI*r());for(let a=0;a<e;a++){let e,o,s,c,l=r();if(l<.22){let t=Math.abs(i())*4.5,n=r()*Math.PI*2;e=Math.cos(n)*t*1.6,o=Math.sin(n)*t*.7;let a=.44;[e,o]=[e*Math.cos(a)-o*Math.sin(a),e*Math.sin(a)+o*Math.cos(a)],s=i()*1.6,c=[1,.86,.62]}else if(l<.42){let t;do t=-Math.log(r()*r())*10;while(t>50);let n=r()*Math.PI*2;e=Math.cos(n)*t,o=Math.sin(n)*t,s=i()*.65,c=[.45,.42,.39]}else{let t=Math.floor(r()*4),n=4+r()**.8*46,a=Ul(n,t)+i()*.16;e=Math.cos(a)*n+i()*1.4,o=Math.sin(a)*n+i()*1.4,s=i()*.5;let l=r();c=l<.15?[1,.55,.65]:l<.6?[.62,.75,1]:[.85,.88,1]}let u=Rl([e,o,s]);t.set([u.x,u.y,u.z],a*3),n.set(c,a*3)}return{pos:t,col:n}}function Kl(e){return new We({size:2,map:e,vertexColors:!0,transparent:!0,opacity:.16,depthWrite:!1,blending:2,sizeAttenuation:!1})}function ql(e,t,n){let r=e.id===`M 31`?22e4:e.id===`M 33`?5e4:e.distLy*e.majArcmin*Math.PI/10800,i=t.kind===`spiral`||t.kind===`flocculent`,a=e.id===`M 31`?36e3:e.id===`M 33`?8800:Math.max(600,Math.round(18e3*(r/Il)**1.8)),{pos:o,col:s}=Vl(`lg:${e.id}:${a}:${e.paDeg}:${JSON.stringify(t)}`,()=>Jl(e,t,a)),c=new tt;c.setAttribute(`position`,new bt(o,3)),c.setAttribute(`color`,new bt(s,3));let l=Kl(n),u=new sn(c,l);u.scale.setScalar(r/Il);let d=Rl(oe(e)).normalize(),f=Rl(oe({raDeg:e.raDeg,decDeg:e.decDeg+.01}));f.addScaledVector(d,-f.dot(d)).normalize();let p=f.clone().cross(d).normalize(),m=(e.paDeg??0)*Math.PI/180,h=f.clone().multiplyScalar(Math.cos(m)).addScaledVector(p,Math.sin(m)),g=d.clone().cross(h).normalize();if(u.quaternion.setFromRotationMatrix(new nn().makeBasis(h,g,d)),i){let e=(t.kind===`flocculent`?54:77)*Math.PI/180;u.rotateX(e)}return u}function Jl(e,t,n){let r=t.kind===`spiral`||t.kind===`flocculent`,i=new Float32Array(n*3),a=new Float32Array(n*3),o=[...e.id].reduce((e,t)=>e*31+t.charCodeAt(0),7)>>>0,s=()=>(o=o*1664525+1013904223>>>0)/4294967296,c=()=>Math.sqrt(-2*Math.log(s()+1e-9))*Math.cos(2*Math.PI*s()),l=t.kind===`flocculent`,u=Array.from({length:t.knots??0},()=>{let e=10+s()*26,n=s()*Math.PI*2;return[Math.cos(n)*e,Math.sin(n)*e*t.axisRatio,2+s()*4]}),d=e=>{let t;do t=-Math.log(Math.max(1e-9,s()*s()))*e;while(t>49);return t},f=l?Array.from({length:48},(e,t)=>({arm:t%2,r:d(11),da:c()*.35})):[];for(let o=0;o<n;o++){let n,p,m,h,g=s();if(r){if(g<t.core){let r=d(2.5),i=s()*Math.PI*2,a=s()*2-1;if(n=r*Math.sqrt(1-a*a)*Math.cos(i),p=r*Math.sqrt(1-a*a)*Math.sin(i),m=r*a*.65,t.bar&&s()<.35){let t=-Math.atan(Math.tan((55.7-(e.paDeg??35))*Math.PI/180)/Math.cos(77*Math.PI/180));n*=1.6,p*=.65,[n,p]=[n*Math.cos(t)-p*Math.sin(t),n*Math.sin(t)+p*Math.cos(t)]}h=[1,.8,.58]}else{let e=g<t.core+(l?.45:.48),r=!l&&g>.96,i=Math.floor(s()*2),a=r?14.8+c()*2.4:d(11),o=l&&!e&&s()<.6?f[Math.floor(s()*f.length)]:null;o&&(i=o.arm,a=Math.max(1,o.r+c()*1.2));let u=(l?22+i*6:12)*Math.PI/180,_=Math.log(1+a/3)/Math.tan(u)+i*Math.PI,v=e||r?s()*Math.PI*2:_+(o?o.da+c()*.12:c()*(l?.5:.35))+(l?.45*Math.sin(a*.35+i*2):0);r&&(a+=1.5*Math.sin(v)+.8*Math.sin(3*v)),n=Math.cos(v)*a,p=Math.sin(v)*a,m=c()*(.35+a*.012);let y=!e&&s()<(l?.09:.035);if(h=e?l?[.56,.58,.64]:[.42,.4,.37]:y?[.95,.42,.55]:r?[.4,.45,.55]:[.63,.76,1],!l){let e=1-.7*Math.exp(-((Math.sin(v-Math.log(1+a/3)/Math.tan(u)-.18)/.13)**2))*dt.smoothstep(a,4,9);h=[h[0]*e,h[1]*e,h[2]*e]}}}else if(t.kind===`elliptical`){let e=d(g<t.core?2.5:11),r=s()*Math.PI*2,i=s()*2-1;n=e*Math.sqrt(1-i*i)*Math.cos(r),p=e*Math.sqrt(1-i*i)*Math.sin(r)*t.axisRatio,m=e*i*t.axisRatio,h=g<t.core?[1,.83,.65]:[.6,.53,.44]}else{if(g<.5){let e=d(12),r=s()*Math.PI*2;n=Math.cos(r)*e,p=Math.sin(r)*e*t.axisRatio,h=[.44,.49,.56]}else if(t.bar&&g<.8){if(n=(s()-.5)*(t.barLength??55),p=c()*3+(t.barPa===void 0?n*.12:0),t.barPa!==void 0){let r=((e.paDeg??0)-t.barPa)*Math.PI/180;[n,p]=[n*Math.cos(r)-p*Math.sin(r),n*Math.sin(r)+p*Math.cos(r)]}h=[.65,.73,.86]}else{let[t,r,i]=u[Math.floor(s()*u.length)];n=t+c()*i,p=r+c()*i,e.id===`NGC 292`&&(n+=12,p+=8),h=s()<.18?[.94,.42,.55]:[.6,.76,1]}m=c()*5}i.set([n,p,m],o*3),a.set(h,o*3)}return{pos:i,col:a}}function Yl(){let e=document.createElement(`canvas`);e.width=e.height=32;let t=e.getContext(`2d`),n=t.createRadialGradient(16,16,0,16,16,16);return n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.2,`rgba(255,255,255,0.65)`),n.addColorStop(.55,`rgba(255,255,255,0.12)`),n.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=n,t.fillRect(0,0,32,32),new un(e)}function Xl(){let e=document.createElement(`canvas`);e.width=e.height=32;let t=e.getContext(`2d`),n=t.createRadialGradient(16,16,0,16,16,16);return n.addColorStop(0,`#fff`),n.addColorStop(.6,`#fff`),n.addColorStop(1,`rgba(255, 255, 255, 0)`),t.fillStyle=n,t.fillRect(0,0,32,32),new un(e)}function Zl(){return new Ue({uniforms:{color:{value:new cn(57599)},opacity:{value:1}},vertexShader:`
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform vec3 color;
      uniform float opacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
        gl_FragColor = vec4(color, (0.0015 + f * 0.018) * opacity);
      }`,transparent:!0,depthWrite:!1,side:2,blending:2})}function Ql(e,t=`#e6edf7`,n=1){let r=document.createElement(`canvas`),i=r.getContext(`2d`),a=`600 44px ui-monospace, Consolas, monospace`;i.font=a;let o=Math.ceil(i.measureText(e).width)+20;r.width=o,r.height=64,i.font=a,i.fillStyle=t,i.textBaseline=`middle`,i.fillText(e,10,34);let s=new un(r);s.colorSpace=Be;let c=new ce(new kt({map:s,depthWrite:!1,transparent:!0}));return c.scale.set(o/64*2.2*n,2.2*n,1),c}function $l(e,t){e.userData.fixedPixelHeight=14,e.userData.aspectRatio=e.scale.x/e.scale.y,t.push(e)}function eu(e,t,n){let r=new Float32Array(t.length*6),i=new tt,a=new bt(r,3);a.setUsage(Pe),i.setAttribute(`position`,a);let o=new $t(i,new Ie({color:8752019,transparent:!0,opacity:.7,depthWrite:!1}));o.frustumCulled=!1,o.renderOrder=1,o.userData.starNameConnector=!0,e.add(o);let s=document.createElement(`div`);s.style.visibility=`hidden`;let c=t.map(e=>{let t=document.createElement(`span`);return t.className=`obs-label`,t.textContent=e.name,s.appendChild(t),{el:t,position:zl(e,e.distLy)}});n.appendChild(s);let l=c.map(e=>({...e,width:e.el.offsetWidth,height:e.el.offsetHeight}));return s.hidden=!0,s.style.visibility=``,{group:e,root:s,anchors:l,connectors:a}}var tu=`
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
  }`,nu=`
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
  }`;function ru(e){return new Ue({uniforms:{color:{value:new cn(57599)},opacity:{value:1}},vertexShader:tu,fragmentShader:nu+e,transparent:!0,depthWrite:!1,side:2,blending:2,premultipliedAlpha:!0})}function iu(){return ru(`
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
    }`)}function au(){return ru(`
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
    }`)}function ou(){return ru(`
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
    }`)}function su(e){switch(e){case`glint`:return iu();case`reflection`:return au();case`thick`:return ou();default:return Zl()}}function cu(e,t){for(let n=0;n<16;n++)if(Math.abs(e.elements[n]-t.elements[n])>1e-6*Math.max(1,Math.abs(t.elements[n])))return!1;return!0}function lu(e,t){let n=e.geometry.getAttribute(`position`),r=e.geometry.getAttribute(`color`),i=0;e.types.forEach((a,o)=>{t.includes(a)||(n.array.set(e.pos.subarray(o*3,o*3+3),i*3),r.array.set(e.col.subarray(o*3,o*3+3),i*3),i++)}),n.needsUpdate=!0,r.needsUpdate=!0,e.geometry.setDrawRange(0,i)}var uu=[0,1,0],du=2200,fu=900,pu=1600,mu=600,hu=.14,gu=e=>1-(1-e)**3;function _u({settings:e,photo:r,onSelectObject:i,onHandle:o}){let{scale:l,galaxyLevel:u,hiddenTypes:f,showConstellations:p,showStarNames:g,constellationChoice:v,constellations:y}=e,b=(0,X.useRef)(l);b.current=l;let C=(0,X.useRef)(r);C.current=r;let w=(0,X.useRef)(i);w.current=i;let T=(0,X.useRef)(o);T.current=o;let O=(0,X.useRef)(null),k=(0,X.useRef)(null);(0,X.useLayoutEffect)(()=>()=>k.current?.disconnect(),[]);let ee=(0,X.useRef)(null),j=(0,X.useRef)(null),N=(0,X.useRef)(null),P=(0,X.useRef)(u);P.current=u;let F=(0,X.useRef)(f);F.current=f;let ne=(0,X.useRef)(p);ne.current=p;let re=(0,X.useRef)(null),ie=(0,X.useRef)(null),I=(0,X.useRef)(y);I.current=y;let ae=(0,X.useRef)(g);ae.current=g;let L=(0,X.useRef)([]),se=(0,X.useRef)([]),z=(0,X.useRef)(null),B=(0,X.useRef)(!0),V=(0,X.useRef)(!0),le=D(e=>e.show3DAnnotations),H=D(e=>e.domeStyle),ue=(0,X.useRef)(H);ue.current=H;let de=D(e=>e.domeOpacity),fe=(0,X.useRef)(de);fe.current=de;let pe=(0,X.useRef)([]),me=(0,X.useRef)(le);me.current=le;let ge=D(e=>e.showGalaxyRegions),U=(0,X.useRef)(ge);U.current=ge;let _e=D(e=>e.annotationColors),ve=(0,X.useMemo)(()=>Object.fromEntries(Object.keys(c).map(e=>[e,Number.parseInt((_e[e]??d[e]).slice(1),16)])),[_e]),ye=x(),be=(0,X.useRef)(ye);be.current=ye;let xe=!!ye,W=(0,X.useRef)(null),Se=(0,X.useRef)(null),Ce=(0,X.useRef)(v);Ce.current=v;let{catalog:G}=A(),K=D(e=>e.select),we=(0,X.useMemo)(()=>G?G.filter(e=>e.distLy!==null):[],[G]);(0,X.useEffect)(()=>{let e=O.current,r=z.current;if(!e||!r||!be.current)return;let i=s(),o=matchMedia(`(prefers-reduced-motion: reduce)`).matches,c=new Ha({antialias:!0,alpha:!0,powerPreference:`low-power`});c.setPixelRatio(Math.min(1.5,devicePixelRatio)),c.setSize(e.clientWidth,e.clientHeight),c.domElement.tabIndex=0,c.domElement.setAttribute(`aria-label`,`Widok 3D. Lewy przycisk myszy: obrót wokół celu, prawy: rozglądanie, środkowy: przesuwanie, kółko: zbliżenie do kursora, WASD lub strzałki: lot, Q i E: w dół i w górę, Shift: szybciej.`),e.appendChild(c.domElement);let l=new on,u=new ln(50,e.clientWidth/e.clientHeight,.1,ko),d=new ks(u,c.domElement);k.current=d,d.mouseButtons={LEFT:Zt.ROTATE,MIDDLE:Zt.PAN,RIGHT:Zt.ROTATE};let f=e=>{e.button===1&&e.preventDefault()};c.domElement.addEventListener(`mousedown`,f),d.zoomToCursor=!0,d.enableDamping=!0,d.dampingFactor=.08,d.autoRotate=!o,d.autoRotateSpeed=.35,d.maxDistance=6e3;let p=[c,d];re.current=null,ie.current=null,L.current=[],se.current=[];let g=Yl();p.push(g);let v=new Y(...t()),y=(e,t,n,r=0)=>{let i=Ql(e,t);return $l(i,L.current),i.renderOrder=2,n&&(i.userData.anchor=n,i.userData.offsetPx=r,i.position.copy(n)),i},x=b.current,D=h(1/0,x),A=we.filter(e=>e.distLy<S).sort((e,t)=>e.distLy-t.distLy),le=we.filter(e=>e.distLy>15e4&&!Ll[e.id]).sort((e,t)=>e.distLy-t.distLy),H=we.filter(e=>Ll[e.id]),de=(e,t,n)=>{let r=new Float32Array(e.length*3),i=new Float32Array(e.length*3),a=new cn;e.forEach((e,t)=>{let n=zl(e,e.distLy);r.set([n.x,n.y,n.z],t*3),a.setHex(ve[e.type]),i.set([a.r,a.g,a.b],t*3)});let o=new tt;o.setAttribute(`position`,new bt(r,3)),o.setAttribute(`color`,new bt(i,3));let s=Xl(),c=new We({size:t,sizeAttenuation:!1,vertexColors:!0,map:s,transparent:!0,opacity:.8,depthWrite:!1});return l.add(new sn(o,c)),p.push(o,c,s),{geometry:o,material:c,counts:n,types:e.map(e=>e.type),pos:r.slice(),col:i.slice()}};j.current=de(A,5,Vt.map(()=>A.length)),lu(j.current,F.current),N.current=de(le,2.5,Vt.map(({maxLy:e})=>le.filter(t=>t.distLy<=e).length)),N.current.geometry.setDrawRange(0,N.current.counts[P.current]);let ge=j.current,_e=N.current,ye=[],xe=[],G=[],Te=new Map,Ee=null,De=null,ke=()=>{Ee&&(Ee.restore(),Ee=null,d.zoomToCursor=!0,B.current=V.current=!0)};ie.current=()=>{let e=I.current;if(!e||re.current)return;let t=new Ge,n=new gl({color:57599,linewidth:1.6,transparent:!0,opacity:.9,depthWrite:!1}),i=Xl(),a=new We({color:12974079,size:5,sizeAttenuation:!1,map:i,transparent:!0,depthWrite:!1});p.push(n,a,i);for(let i of e.constellations){let e=[],o=new Map;for(let t of i.lines)for(let n=1;n<t.length;n++){let r=t[n-1],i=t[n];if(r&&i)for(let t of[r,i]){let n=zl({raDeg:t[0],decDeg:t[1]},t[2]);e.push(n.x,n.y,n.z),o.set(t.join(`,`),n)}}let s=new Ge;s.name=i.abbr,s.visible=Ce.current===`all`||Ce.current===i.abbr;for(let e of o.values())G.push({group:s,position:e});let c=new hl().setPositions(e),l=new Fl(c,n),u=[...o.values()],d=new tt().setFromPoints(u),f=new sn(d,a);s.add(l,f),Te.set(i.abbr,{group:s,lines:l,dots:f,segments:e,stars:u});let m=new Ge;m.name=`star-names`,m.visible=ae.current,m.userData.stars=i.stars??[],m.userData.labelsAdded=!1,ae.current&&(se.current.push(eu(m,i.stars??[],r)),m.userData.labelsAdded=!0),s.add(m),t.add(s),p.push(c,d)}t.visible=ne.current&&x===`galaxy`,l.add(t),re.current=t,B.current=!0,V.current=!0},ie.current();let Ae=Hl(85e3,g);l.add(Ae),p.push(Ae.geometry,Ae.material);{let e=1/m,t=[];pe.current=t,p.push({dispose:()=>t.forEach(e=>e.material.dispose())});for(let[n,r]of[[1e6,`1 mln lś`],[1e7,`10 mln lś`],[1e8,`100 mln lś`],[1e9,`1 mld lś`]]){let i=Math.log10(n/1e4)*te,a=new yt({color:57599,transparent:!0,opacity:.18,side:2}),o=new pt(new nt(i-.08*e,i+.08*e,128),a);o.position.copy(v),o.rotation.x=-Math.PI/2,l.add(o),p.push(o.geometry,a);let s=new pt(new Me(i,128,48,0,Math.PI*2,0,Math.PI/2),su(ue.current));s.position.copy(v),s.userData.fade=1,t.push(s),l.add(s),p.push(s.geometry);let c=y(r,`#6fdcf0`);c.position.set(v.x+i+2*e,v.y+e,v.z),l.add(c),xe.push((e,t)=>{o.visible=s.visible=e>0,c.visible=t>0,a.opacity=.18*e,s.userData.fade=e,s.material.uniforms.opacity.value=e*fe.current,c.material.opacity=t})}H.forEach(e=>{let t=ql(e,Ll[e.id],g);t.position.copy(zl(e,e.distLy)),ye.push(t),l.add(t),p.push(t.geometry,t.material)})}let je,Ne;{let e=dc(`/`,c.capabilities.getMaxAnisotropy(),()=>{V.current=!0});Ne=mc(1,e),je=Ne.mesh;let t=new Ge;t.position.copy(v),t.quaternion.setFromUnitVectors(new Y(0,1,0),Rl(oe({raDeg:0,decDeg:90})).normalize()),t.add(je),l.add(t),l.add(new gt(13624575,.65));let n=new Oe(16775406,2.1);n.position.copy(v).add(new Y(10,15,10)),n.target.position.copy(v),l.add(n,n.target),p.push(e,...Ne.disposables)}let Pe=y(`Ziemia`,`#93cfff`,v,-30),Fe=y(`Droga Mleczna`,`#e6edf7`);Fe.position.set(0,-4.2/m,0),l.add(Pe,Fe);let Le=()=>{re.current&&(re.current.visible=ne.current&&x===`galaxy`),Pe.visible=x===`galaxy`,Fe.visible=x===`universe`,B.current=V.current=!0};Le();let Re=null,ze=e=>{let t=u.position.length();if(D=h(t,x),Re){Re.start??=e;let n=M(Re,t,x,e,Lo);D=n.fades,n.done&&(Re=null)}let n=pn.layerFade,r=pn.labelFade;ge.material.opacity=.8*D.galactic*n,ge.material.visible=D.galactic*n>0,_e.material.opacity=.8*D.extragalactic*n,_e.material.visible=D.extragalactic*n>0;for(let e of xe)e(D.extragalactic*n,D.extragalactic*r);Pe.material.opacity=D.galactic*r,Fe.material.opacity=D.extragalactic*r};u.position.set(0,x===`galaxy`?120:200/m,.01);let q=null,Be=null,Ve=(e,t)=>{(e!==u.fov||t!==u.near)&&(u.fov=e,u.near=t,u.updateProjectionMatrix())},He=(e,t,n=50,r=.1,i=0,a=gu,s=!1)=>{let c=u.position.toArray(),l=d.target.toArray(),f=d.enableDamping;d.enableDamping=!1,d.update(),d.enableDamping=f,u.position.set(...c),d.target.set(...l),u.lookAt(d.target),V.current=!0,Be=null,o?(q=null,u.position.set(...e.position),d.target.set(...e.target),Ve(n,r),i===0?ke():Ee?.update(i)):q={from:{position:c,target:l,up:uu},to:{...e,up:uu},start:null,ms:t,easing:a,zoom:s,fromFov:u.fov,toFov:n,fromNear:u.near,toNear:r,fromSky:Ee?.amount??0,toSky:i}},Ue=()=>{Be||u.fov===50&&!Ee||(Be={start:null,fov:u.fov,sky:Ee?.amount??0})},Ke=new Ge;l.add(Ke);let qe=be.current,Je=v.clone(),Xe=!1,Ze=.35,Qe=(e,t,r=!1)=>{De=null;for(let e of[...Ke.children])if(Ke.remove(e),e instanceof ce)L.current=L.current.filter(t=>t!==e),e.material.map?.dispose(),e.material.dispose();else{let t=e;t.geometry.dispose(),t.material.dispose()}qe=e;let i=e.distLy??null;Xe=i!==null&&!(x===`galaxy`&&i>15e4);let a=i===null&&e.type!==`G`&&e.type!==`GG`,o=x===`galaxy`?8:a?16/m:n,s=Rl(oe(e)).normalize();Je=Xe?zl(e,i):v.clone();let c=v.distanceTo(Je),l=Math.max(o,c*2.2)/40;Ze=(c>0?Math.min(.5*l,c*.15):.5*l)*.7;let d={dashSize:.25*l,gapSize:.18*l};if(Xe){let t=new Ye(new tt().setFromPoints([v,Je]),new R({color:57599,...d,transparent:!0,opacity:.8}));t.computeLineDistances();let n=new Y(Je.x,v.y,Je.z),r=new Ye(new tt().setFromPoints([Je,n,v]),new Ie({color:57599,transparent:!0,opacity:x===`universe`?.6:.35}));Ke.add(t,r,y(e.id,`#00e0ff`,Je,26))}else{let e=a?Il/2e3:x===`galaxy`?S/1e3:Math.log10(1e5)*te,t=v.dot(s),n=!a&&x===`universe`?e:-t+Math.sqrt(t*t-v.lengthSq()+e*e),r=new Ye(new tt().setFromPoints([v,v.clone().addScaledVector(s,n)]),new R({color:57599,...d}));r.computeLineDistances(),Ke.add(r)}if(B.current=!0,V.current=!0,zt=0,C.current){Ue();return}let f=Xe?Je:v.clone().addScaledVector(s,o*.4),p=v.clone().lerp(f,.5),h=f.clone().sub(v);He(No([v.toArray(),f.toArray()],jo(h.toArray(),x===`galaxy`?[p.x,0,p.z]:void 0),{fovDeg:50,aspect:u.aspect,room:[.42,.42],minDistance:o*1.08}),t,50,.1,0,r?Lo:gu,r)};W.current=(e,t,n=!1)=>{t===x?(e!==qe||n)&&Qe(e,fu):(Re=!o&&!pn.camera?{...E(D,u.position.length(),x,0,pu),start:null}:null,x=t,Le(),Qe(e,pu,!0))},Se.current=()=>{zt=0,B.current=!0,V.current=!0};let $e=0,et=performance.now(),rt=0,it=new Set,at=null,ot=new Set([`KeyW`,`KeyA`,`KeyS`,`KeyD`,`KeyQ`,`KeyE`,`ArrowUp`,`ArrowLeft`,`ArrowDown`,`ArrowRight`]),st=!1,ct=new Set,lt=new Y,ut=()=>{let e=Math.min(u.position.distanceTo(v),u.position.distanceTo(lt));Xe&&(e=Math.min(e,u.position.distanceTo(Je)));for(let t of ct)e=Math.min(e,u.position.distanceTo(t));return Math.max(e,.02)},ft=()=>{q&&(q.toSky>0||q.toFov!==50||Ee)&&Ue(),q=null},mt=e=>{let t=document.activeElement;t!==c.domElement&&!t?.classList.contains(`constellation-select`)||!ot.has(e.code)||e.altKey||e.ctrlKey||e.metaKey||(e.preventDefault(),c.domElement.focus({preventScroll:!0}),it.add(e.code),st=e.shiftKey,ft(),d.autoRotate=!1)},ht=e=>{it.delete(e.code),st=e.shiftKey},_t=()=>it.clear();window.addEventListener(`keydown`,mt),window.addEventListener(`keyup`,ht),window.addEventListener(`blur`,_t);let vt=new Y,xt=new Y,St=new Y,Ct=new Y,wt=new Y,Tt=new Y,Et=new Y,Dt=new Y,Ot=new Y;d.addEventListener(`start`,()=>{ft(),d.autoRotate=!1});let kt=new Y,At=new Y,jt=new Y,Mt=new Y,Nt=new nn,Pt=new nn,J=new nn,Ft=new nn,It=0,Lt=0,Rt=!1,zt=0,Bt=0,Ht=null,Ut=-1,Wt=-1,Gt=null,Kt=null,qt=!1,Jt=new nn,Yt=new nn,Xt=0,Qt=0,en=null,tn=-1/0;V.current=!0;let rn=new Set,an=new Set,un=new Set,dn=new Set,fn=new nn,pn={camera:!1,layerFade:1,labelFade:1,earthRadius:null,earthBlend:0},mn=!1,hn=e.clientWidth,gn=e.clientHeight,_n=()=>{(e.clientWidth!==hn||e.clientHeight!==gn)&&(hn=e.clientWidth,gn=e.clientHeight,Tn(),u.aspect=hn/Math.max(1,gn),u.updateProjectionMatrix(),c.setSize(hn,gn))},vn=t=>{_n();for(let e of rn)e(t);let n=Math.min(Math.max(0,t-et)/1e3,.05);if(et=t,rt+=n*1e3,o||Ne.spin(t),q&&!pn.camera){q.start??=rt;let e=Math.min(1,(rt-q.start)/q.ms),t=q.easing(e),n=(q.zoom?is:rs)(q.from,q.to,t);Ee?.update(dt.lerp(q.fromSky,q.toSky,t)),Ve(dt.lerp(q.fromFov,q.toFov,t),dt.lerp(q.fromNear,q.toNear,t)),u.position.set(...n.position),d.target.set(...n.target),e>=1&&(q.toSky===0&&ke(),q=null)}if(Be&&!q&&!pn.camera){Be.start??=rt;let e=Math.min(1,(rt-Be.start)/mu),t=Lo(e);Ve(dt.lerp(Be.fov,50,t),u.near),Ee?.update(Be.sky*(1-t)),e>=1&&(Be=null,ke())}if(!q&&!pn.camera&&it.size){let e=u.getWorldDirection(kt),t=At.set(1,0,0).applyQuaternion(u.quaternion),r=jt.set(0,0,0);if((it.has(`KeyW`)||it.has(`ArrowUp`))&&r.add(e),(it.has(`KeyS`)||it.has(`ArrowDown`))&&r.sub(e),(it.has(`KeyD`)||it.has(`ArrowRight`))&&r.add(t),(it.has(`KeyA`)||it.has(`ArrowLeft`))&&r.sub(t),it.has(`KeyE`)&&(r.y+=1),it.has(`KeyQ`)&&--r.y,r.lengthSq()){let e=ut()*.6*(st?4:1);r.normalize().multiplyScalar(e*n),u.position.add(r),d.target.add(r),at?.position.add(r)}}!at&&!pn.camera&&d.update();let s=!1;C.current&&(d.autoRotate=!1),u.updateMatrixWorld(),ze(rt),Ee&&(x!==`galaxy`||!ne.current||Ce.current!==Ee.group.name)?(Be=null,ke()):Ee&&!q&&!pn.camera&&u.getWorldDirection(Et).dot(Ee.forward)<.999999&&Ue();for(let e of un)e(t);{xt.copy(v).applyMatrix4(u.matrixWorldInverse);let e=-xt.z,t=c.domElement.clientWidth,n=Math.max(1,c.domElement.clientHeight),r=2*e*Math.tan(dt.degToRad(u.getEffectiveFOV())/2)/n;Ct.copy(v).project(u);let i=7,a=Ee?.amount??0;if(ne.current&&x===`galaxy`&&a<1)for(let e of G){if(!e.group.visible||(Ee?.group===e.group?wt.set(...Ee.project(e.position.toArray())):wt.copy(e.position),wt.project(u),wt.z<-1||wt.z>1))continue;let r=Math.hypot((wt.x-Ct.x)*t/2,(wt.y-Ct.y)*n/2);i=Math.min(i,Math.max(0,r-7))}i=dt.lerp(i,8,a);let o=(e>0?Math.min(Ze,i*r):Ze)*D.galactic,l=pn.earthRadius===null?o:o+(pn.earthRadius-o)*pn.earthBlend;je.scale.setScalar(l),pn.camera||(je.visible=l>1e-6);let d=e>0?l/r:0;s=je.visible&&d>0&&Math.abs(Ct.x)<=1+2*d/Math.max(1,t)&&Math.abs(Ct.y)<=1+2*d/n}{let e=2e3*u.position.distanceTo(d.target)*Math.tan(u.getEffectiveFOV()*Math.PI/360)/Math.max(1,gn),t=dt.smoothstep(e,5,90),n=pn.layerFade*dt.lerp(hu,1,D.galactic);Ae.geometry.setDrawRange(0,Math.round(35e3+5e4*t)),Ae.material.size=3.5-.4*t,Ae.material.opacity=(.38-.08*t)*n}for(let e of ye){let t=u.position.distanceTo(e.position)/(50*e.scale.x),n=1-dt.smoothstep(t,2,10),r=e.material;r.size=2.4+n*.8;let i=D.extragalactic*pn.layerFade;r.opacity=(.1+n*.18)*i,r.visible=i>0}Ke.visible=!C.current;let f=c.domElement.clientHeight,p=c.domElement.clientWidth;if(r.style.opacity=String(pn.layerFade),pn.layerFade===0)B.current=!0;else if(f>0&&L.current.length&&(B.current||p!==It||f!==Lt||Ke.visible!==Rt||!cu(J,u.matrixWorld)||!cu(Ft,u.projectionMatrix))){B.current=!1,J.copy(u.matrixWorld),Ft.copy(u.projectionMatrix),It=p,Lt=f,Rt=Ke.visible;let e=Math.tan(dt.degToRad(u.getEffectiveFOV())/2);Dt.set(0,1,0).applyQuaternion(u.quaternion).normalize();for(let t of L.current){let n=t.visible;for(let e=t.parent;n&&e;e=e.parent)n=e.visible;if(!n)continue;let r=t.userData.anchor;xt.copy(r??t.getWorldPosition(vt)).applyMatrix4(u.matrixWorldInverse);let i=-xt.z;if(i<=0)continue;let a=2*i*e/f,o=a*t.userData.fixedPixelHeight;t.scale.set(o*t.userData.aspectRatio,o,1),r&&t.position.copy(r).addScaledVector(Dt,t.userData.offsetPx*a)}let t=[];for(let n of se.current)if(n.root.hidden=!n.group.visible||!n.group.parent?.visible||!n.group.parent.parent?.visible,!n.root.hidden){for(let r=0;r<n.anchors.length;r++){let i=n.anchors[r],a=Ee?.group===n.group.parent?Tt.set(...Ee.project(i.position.toArray())):i.position;xt.copy(a).applyMatrix4(u.matrixWorldInverse);let o=-xt.z;St.copy(a).project(u);let s=i.height,c=i.width/2,l=(St.x+1)*p/2,d=(1-St.y)*f/2,m={left:l-c-2,right:l+c+2,top:d-s-6,bottom:d-4},h=()=>t.some(e=>m.left<e.right&&m.right>e.left&&m.top<e.bottom&&m.bottom>e.top);for(;d-m.bottom<48&&h();)m.top-=s+2,m.bottom-=s+2;i.el.hidden=o<=0||Math.abs(St.z)>1||m.top<0||m.bottom>f||m.right<0||m.left>p||h(),i.el.hidden||(t.push(m),i.el.style.transform=`translate(${Math.round(l-c)}px, ${Math.round(m.bottom-s)}px)`);let g=i.el.hidden?0:2*o*e*(d-m.bottom)/f;Ot.copy(a).addScaledVector(Dt,g),n.connectors.setXYZ(r*2,a.x,a.y,a.z),n.connectors.setXYZ(r*2+1,Ot.x,Ot.y,Ot.z)}n.connectors.needsUpdate=!0}}let m=c.domElement;(V.current||!cu(Jt,u.matrixWorld)||!cu(Yt,u.projectionMatrix)||m.width!==Xt||m.height!==Qt||Ke.visible!==en||s&&!o&&t-tn>=33.333333333333336||t-tn>=1e3)&&(c.render(l,u),i!==null&&(_(`space3d:scene→first-frame`,i),i=null),V.current=!1,Jt.copy(u.matrixWorld),Yt.copy(u.projectionMatrix),Xt=m.width,Qt=m.height,en=Ke.visible,tn=t),En();let h=ee.current;if(h){let t=Mt.copy(Je).project(u),n=!C.current&&Xe&&t.z<1;if(h.style.display=n?``:`none`,n){let n=a(u.position.distanceTo(Je),x);h.style.transform=`translate(${(t.x+1)/2*e.clientWidth}px, ${(1-t.y)/2*e.clientHeight}px) scale(${n.toFixed(3)})`}}let g=cu(fn,u.matrixWorld);if(fn.copy(u.matrixWorld),dn.size&&g&&!q&&!Be&&!Re){let e=[...dn];dn.clear();for(let t of e)t()}},yn=(e=performance.now())=>{vn(e),$e=requestAnimationFrame(yn)},bn=document.createElement(`canvas`);bn.style.cssText=`position:absolute;inset:0;pointer-events:none`,e.appendChild(bn);let xn=bn.getContext(`2d`),Sn=A.map(e=>zl(e,e.distLy)),Cn=le.map(e=>zl(e,e.distLy)),wn=H.map(e=>zl(e,e.distLy)),X=new Y,Tn=()=>{let t=Math.min(2,devicePixelRatio);bn.width=e.clientWidth*t,bn.height=e.clientHeight*t,xn.setTransform(t,0,0,t,0,0)};Tn();let Z=[];function En(){let t=e.clientWidth,n=e.clientHeight,r=!!C.current,i=U.current&&x===`galaxy`?pn.labelFade*D.galactic:0;if(pn.layerFade===0){zt!==0&&(xn.clearRect(0,0,t,n),Z=[],zt=0);return}if(t===zt&&n===Bt&&me.current===Ht&&i===Wt&&P.current===Ut&&F.current===Gt&&x===Kt&&r===qt&&cu(Nt,u.matrixWorld)&&cu(Pt,u.projectionMatrix))return;zt=t,Bt=n,Ht=me.current,Wt=i,Ut=P.current,Gt=F.current,Kt=x,qt=r,Nt.copy(u.matrixWorld),Pt.copy(u.projectionMatrix),xn.clearRect(0,0,t,n),Z=[];let a=F.current,o=x===`galaxy`,s=o?D.galactic:D.extragalactic,c=o?A:le,l=o?Sn:Cn,d=s===0?0:o?A.length:_e.counts[P.current],f=[];for(let e=0;e<d;e++){let i=c[e];!r&&i.i===qe.i||o&&a.includes(i.type)||(X.copy(l[e]).project(u),!(X.z>1||Math.abs(X.x)>1||Math.abs(X.y)>1)&&f.push({c:i,x:(X.x+1)/2*t,y:(1-X.y)/2*n,d:u.position.distanceToSquared(l[e]),localGroup:!1}))}for(let e=0;e<H.length&&!o&&s>0;e++){let i=H[e];if(!r&&i.i===qe.i)continue;let a=wn[e];X.copy(a).project(u),!(X.z>1||Math.abs(X.x)>1||Math.abs(X.y)>1)&&f.push({c:i,x:(X.x+1)/2*t,y:(1-X.y)/2*n,d:u.position.distanceToSquared(a),localGroup:!0})}f.sort((e,t)=>Number(t.localGroup)-Number(e.localGroup)||e.d-t.d);for(let e of f)Z.push({c:e.c,x:e.x,y:e.y,box:null});xn.globalAlpha=s,xn.font=`10px ui-monospace, Consolas, monospace`,xn.lineJoin=`round`,xn.lineWidth=3;let p=[];for(let e of f){if(!me.current||p.length>=120)break;let r=xn.measureText(e.c.id).width,i=(e,t)=>[e-2,t-11,e+r+2,t+3],a=e=>p.some(t=>e[0]<t[2]&&e[2]>t[0]&&e[1]<t[3]&&e[3]>t[1]),o=e.x+6,s=e.y+3,c=i(o,s);if(e.localGroup){let l=[[e.x+7,e.y+3],[e.x+7,e.y-12],[e.x+7,e.y+18],[e.x-r-7,e.y+3],[e.x-r-7,e.y-12],[e.x-r-7,e.y+18],[e.x+18,e.y-25],[e.x+18,e.y+31],[e.x-r-18,e.y-25],[e.x-r-18,e.y+31]],u=([e,r])=>{let a=i(e,r);return a[0]>=2&&a[1]>=2&&a[2]<=t-2&&a[3]<=n-2},d=l.find(([e,t])=>u([e,t])&&!a(i(e,t)))??l.find(u);d&&([o,s]=d),c=i(o,s)}else if(a(c))continue;p.push(c),Z.push({c:e.c,x:e.x,y:e.y,box:[Math.min(e.x-6,c[0]),c[1],Math.max(e.x+6,c[2]),c[3]]}),xn.strokeStyle=`rgba(2, 5, 13, 0.85)`,xn.strokeText(e.c.id,o,s),xn.fillStyle=`#${ve[e.c.type].toString(16).padStart(6,`0`)}c0`,xn.fillText(e.c.id,o,s)}if(!(i<=0)){for(let e of[v,...r?ct:[Je]]){if(X.copy(e).project(u),Math.abs(X.z)>=1)continue;let r=(1+X.x)*t/2,i=(1-X.y)*n/2;p.push([r-12,i-13,r+12,i+13])}xn.globalAlpha=i,xn.font=`italic 13px system-ui, sans-serif`,xn.strokeStyle=`rgba(2, 5, 13, 0.85)`,xn.fillStyle=`#d4d9e5`;for(let{name:e,anchor:r}of Wl){if(X.copy(r).project(u),Math.abs(X.z)>=1)continue;let i=(1+X.x)*t/2,a=(1-X.y)*n/2,o=xn.measureText(e).width/2;i-o<4||i+o>t-4||a<16||a>n-4||p.some(([e,t,n,r])=>i+o+4>e&&i-o-4<n&&a+4>t&&a-14<r)||(p.push([i-o,a-14,i+o,a+4]),xn.strokeText(e,i-o,a),xn.fillText(e,i-o,a))}}}let Dn=e=>{let t=c.domElement.getBoundingClientRect(),n=e.clientX-t.left,r=e.clientY-t.top,i=Z.findLast(e=>e.box&&n>=e.box[0]&&n<=e.box[2]&&r>=e.box[1]&&r<=e.box[3]);if(i)return i.c;let a=null,o=64;for(let e of Z){let t=(e.x-n)**2+(e.y-r)**2;t<o&&([a,o]=[e.c,t])}return a},Q=null,$=e=>{Q=[e.clientX,e.clientY],c.domElement.focus({preventScroll:!0})},On=(e,t)=>{let n=c.domElement.getBoundingClientRect();for(let r of an)if(r(e.clientX-n.left,e.clientY-n.top,t))return!0;return!1},kn=e=>{if(Q&&Math.hypot(e.clientX-Q[0],e.clientY-Q[1])<5&&!On(e,!0)){let t=Dn(e);t&&(C.current&&w.current?.(),K(t.i,!1))}Q=null},An=new he(0,0,0,`YXZ`),jn=new Y,Mn=e=>{e.button===1&&!pn.camera?(ft(),d.autoRotate=!1,d.target.copy(u.position).addScaledVector(u.getWorldDirection(jn),ut())):e.button===2&&(e.preventDefault(),e.stopImmediatePropagation(),ft(),d.autoRotate=!1,c.domElement.focus({preventScroll:!0}),An.setFromQuaternion(u.quaternion,`YXZ`),at={pointerId:e.pointerId,x:e.clientX,y:e.clientY,distance:u.position.distanceTo(d.target),yaw:An.y,pitch:An.x,position:u.position.clone()},c.domElement.setPointerCapture(e.pointerId))},Nn=e=>{at&&e.pointerId===at.pointerId&&(e.preventDefault(),e.stopImmediatePropagation(),at.yaw-=(e.clientX-at.x)*.003,at.pitch=dt.clamp(at.pitch-(e.clientY-at.y)*.003,-Math.PI/2+.01,Math.PI/2-.01),at.x=e.clientX,at.y=e.clientY,An.set(at.pitch,at.yaw,0,`YXZ`),u.position.copy(at.position),u.quaternion.setFromEuler(An),d.target.copy(at.position).addScaledVector(u.getWorldDirection(jn),at.distance))},Pn=e=>{if(!at||e.pointerId!==at.pointerId)return;e.preventDefault(),e.stopImmediatePropagation();let t=at;at=null;let n=d.enableDamping;d.enableDamping=!1,d.update(),u.position.copy(t.position),An.set(t.pitch,t.yaw,0,`YXZ`),u.quaternion.setFromEuler(An),d.target.copy(t.position).addScaledVector(u.getWorldDirection(jn),t.distance),d.update(),d.enableDamping=n},Fn=e=>e.preventDefault(),In=e=>c.domElement.style.cursor=!e.buttons&&(On(e,!1)||Dn(e))?`pointer`:``;c.domElement.addEventListener(`pointerdown`,Mn,!0),c.domElement.addEventListener(`pointermove`,Nn,!0),c.domElement.addEventListener(`pointerup`,Pn,!0),c.domElement.addEventListener(`pointercancel`,Pn,!0),c.domElement.addEventListener(`contextmenu`,Fn),c.domElement.addEventListener(`pointerdown`,$),c.domElement.addEventListener(`pointerup`,kn),c.domElement.addEventListener(`pointermove`,In),Qe(qe,du);let Ln=!1,Rn=()=>{Ln||$e||mn||document.hidden||yn()};c.compileAsync(l,u).then(Rn,Rn);let zn=new ResizeObserver(()=>{mn||_n()});zn.observe(e);let Bn=matchMedia(`(resolution: ${devicePixelRatio}dppx)`),Vn=()=>{c.setPixelRatio(Math.min(1.5,devicePixelRatio)),Tn(),zt=0,V.current=!0,Bn.removeEventListener(`change`,Vn),Bn=matchMedia(`(resolution: ${devicePixelRatio}dppx)`),Bn.addEventListener(`change`,Vn)};Bn.addEventListener(`change`,Vn);let Hn=()=>{cancelAnimationFrame($e),!document.hidden&&!mn&&yn()};return document.addEventListener(`visibilitychange`,Hn),T.current?.({scene:l,camera:u,controls:d,renderer:c,mount:e,overlay:bn,sunPos:v,earth:je,hooks:rn,claims:an,layout:un,anchors:ct,override:pn,step:vn,invalidate:()=>{V.current=!0},stopIntro:()=>{q=null,Be=null,d.autoRotate=!1},afterFlight:e=>(dn.add(e),()=>{dn.delete(e)}),flyTo:(e,t,n=!1)=>{De=null,d.autoRotate=!1,He(e,t??(n?pu:fu),50,.1,0,n?Lo:gu,n)},viewConstellation:e=>{if(De?.abbr===e){let{pose:e,fov:t,near:n}=De;De=null,d.autoRotate=!1,He(e,fu,t,n,0,Lo);return}let t=Te.get(e);if(!t)return;let{group:n,lines:r,dots:i,segments:a,stars:o}=t,s=Ao(o.map(e=>e.toArray()),v.toArray(),u.aspect);if(s){if(De=De?{...De,abbr:e}:{abbr:e,pose:q?.to??{position:u.position.toArray(),target:d.target.toArray()},fov:q?.toFov??u.fov,near:q?.toNear??u.near},Ee?.group!==n){ke();let e=new hl().setPositions(a),t=new tt().setFromPoints(o),c=r.geometry,l=i.geometry,u=e.attributes.instanceStart.data,d=t.getAttribute(`position`),f=o.flatMap(e=>e.toArray()),p=e=>{let t=[];for(let n=0;n<e.length;n+=3)t.push(...s.project([e[n],e[n+1],e[n+2]]));return t},m=p(a),h=p(f);r.geometry=e,i.geometry=t,Ee={group:n,forward:new Y(...s.forward),amount:0,project(e){let t=s.project(e);return[dt.lerp(e[0],t[0],this.amount),dt.lerp(e[1],t[1],this.amount),dt.lerp(e[2],t[2],this.amount)]},update(n){if(n!==this.amount){this.amount=n;for(let e=0;e<a.length;e++)u.array[e]=dt.lerp(a[e],m[e],n);for(let e=0;e<f.length;e++)d.array[e]=dt.lerp(f[e],h[e],n);u.needsUpdate=d.needsUpdate=!0,e.computeBoundingBox(),e.computeBoundingSphere(),t.computeBoundingSphere(),B.current=V.current=!0}},restore(){r.geometry=c,i.geometry=l,e.dispose(),t.dispose()}}}d.zoomToCursor=!1,d.autoRotate=!1,He(s,fu,s.fov,.001,1,Lo)}},setExternal:e=>{e!==mn&&(mn=e,cancelAnimationFrame($e),!e&&!document.hidden&&yn())}}),()=>{Ln=!0,ke(),ie.current=null,T.current?.(null),W.current=null,cancelAnimationFrame($e),zn.disconnect(),Bn.removeEventListener(`change`,Vn),document.removeEventListener(`visibilitychange`,Hn),window.removeEventListener(`keydown`,mt),window.removeEventListener(`keyup`,ht),window.removeEventListener(`blur`,_t),c.domElement.removeEventListener(`mousedown`,f),c.domElement.removeEventListener(`pointerdown`,Mn,!0),c.domElement.removeEventListener(`pointermove`,Nn,!0),c.domElement.removeEventListener(`pointerup`,Pn,!0),c.domElement.removeEventListener(`pointercancel`,Pn,!0),c.domElement.removeEventListener(`contextmenu`,Fn),c.domElement.removeEventListener(`pointerdown`,$),c.domElement.removeEventListener(`pointerup`,kn),c.domElement.removeEventListener(`pointermove`,In);for(let e of Ke.children){if(e instanceof ce)continue;let t=e;t.geometry.dispose(),t.material.dispose()}l.traverse(e=>{e instanceof ce&&(e.material.map?.dispose(),e.material.dispose()),e instanceof $t&&e.userData.starNameConnector&&(e.geometry.dispose(),Array.isArray(e.material)?e.material.forEach(e=>e.dispose()):e.material.dispose())}),L.current=[],se.current=[],r.replaceChildren(),p.forEach(e=>e.dispose()),c.forceContextLoss(),c.domElement.remove(),bn.remove()}},[xe,we,K,ve]);let Te=!!r,Ee=(0,X.useRef)(Te);return(0,X.useEffect)(()=>{let e=Ee.current;Ee.current=Te,e!==Te&&Se.current?.(),ye&&W.current?.(ye,l,e&&!Te)},[ye,l,Te]),(0,X.useEffect)(()=>{ie.current?.()},[y]),(0,X.useEffect)(()=>{re.current&&(re.current.visible=p&&b.current===`galaxy`),B.current=!0,V.current=!0},[p]),(0,X.useEffect)(()=>{re.current?.children.forEach(e=>{e.visible=v===`all`||v===e.name}),B.current=!0,V.current=!0},[v]),(0,X.useEffect)(()=>{let e=z.current;e&&(re.current?.children.forEach(t=>{let n=t.getObjectByName(`star-names`);n&&(g&&!n.userData.labelsAdded&&(se.current.push(eu(n,n.userData.stars,e)),n.userData.labelsAdded=!0),n.visible=g)}),B.current=!0,V.current=!0)},[g]),(0,X.useEffect)(()=>{let e=N.current;e&&e.geometry.setDrawRange(0,e.counts[u]),V.current=!0},[u]),(0,X.useEffect)(()=>{for(let e of pe.current){let t=e.material;e.material=su(H),e.material.uniforms.opacity.value=e.userData.fade*fe.current,t.dispose()}V.current=!0},[H]),(0,X.useEffect)(()=>{for(let e of pe.current)e.material.uniforms.opacity.value=e.userData.fade*de;V.current=!0},[de]),(0,X.useEffect)(()=>{j.current&&lu(j.current,f),V.current=!0},[f]),ye?(0,Z.jsxs)(`div`,{className:`space-layer`,children:[(0,Z.jsx)(`div`,{ref:O,style:{position:`absolute`,inset:0},children:(0,Z.jsx)(`div`,{ref:z,className:`obs-labels space-star-labels`,"aria-hidden":!0})}),(0,Z.jsx)(`div`,{className:`obs-hint space-hint faint`,"aria-hidden":!0,children:`LPM: obrót · PPM: rozglądanie · ŚPM: przesuwanie · kółko: zbliżenie do kursora · WASD + Q/E: lot · Shift: szybciej`}),(0,Z.jsxs)(`div`,{ref:ee,className:`pin`,style:{display:`none`},"aria-hidden":!0,children:[(0,Z.jsx)(`span`,{className:`pin-ring`}),(0,Z.jsx)(`span`,{className:`pin-ring pin-ring-delay`}),(0,Z.jsx)(`span`,{className:`pin-dot`})]})]}):(0,Z.jsx)(`div`,{className:`space-layer space-empty`,children:`Wybierz obiekt.`})}var vu=.001,yu=33,bu=[0,1,0],xu=1.5,Su=class{o;raf=0;elapsed=0;last=null;phase=null;frozen=null;skipping=!1;finished=!1;observatoryStarted=!1;bridge;roll;real;pyramid;spacePose;obsEnd=null;constructor(e){this.o=e;let{space:t,guide:n}=e;this.real=n?.fieldTan??[1,1],this.pyramid=[50/70,100*e.imageAspect/2/70],this.spacePose=e.spacePose??{position:t.camera.position.toArray(),target:t.controls.target.toArray(),up:t.camera.up.toArray(),fov:t.camera.fov,near:t.camera.near},this.roll=n?Uo(n.basis,this.spacePose.up):0,this.bridge=n?Wo(t.sunPos.toArray(),n.basis,[0,0,70],this.roll):null,n?.setVisible(!0),wu(t,n,!0),t.stopIntro(),t.setExternal(!0),t.override.camera=!0,t.controls.enabled=!1,this.raf=requestAnimationFrame(this.loop)}skip(){this.skipping=!0}reverse(){if(this.finished||this.o.direction!==`in`)return!1;let e=this.o.observatory();return!e?.ready||this.elapsed<=0?!1:(this.elapsed=Vo(this.elapsed,`in`,`out`),this.o.direction=`out`,this.skipping=!1,this.frozen=null,this.last=null,this.phase===`enter`&&(this.obsEnd=e.getPose()),!0)}cancel(){cancelAnimationFrame(this.raf)}spaceEarthPx(){let{camera:e,mount:t,sunPos:n,earth:r}=this.o.space;return r?r.geometry.parameters.radius*r.scale.x/(e.position.distanceTo(n)*Math.tan(dt.degToRad(e.fov)/2))*t.clientHeight/2:0}seamCheck(){let e=this.o.observatory(),{guide:t}=this.o;if(!e||!t)return null;let{camera:n,mount:r,sunPos:i}=this.o.space,{position:a,fov:o}=e.getPose(),s=xu/(Math.hypot(a[0],a[1],a[2]-70)*Math.tan(dt.degToRad(o)/2))*r.clientHeight/2,c=e=>{let t=e.clone().project(n);return[(t.x+1)/2*r.clientWidth,(1-t.y)/2*r.clientHeight]},l=i.clone().addScaledVector(new Y(...t.basis.center),100*vu),u=c(i),d=c(l),f=e.screenPoint([0,0,70]),p=e.screenPoint([0,0,-30]),m=(e,t)=>Math.atan2(t[1]-e[1],t[0]-e[0])*180/Math.PI;return{space:u,observatory:f,spaceAngle:m(u,d),observatoryAngle:m(f,p),spaceEarthPx:this.spaceEarthPx(),observatoryEarthPx:s}}loop=e=>{this.raf=requestAnimationFrame(this.loop),this.frame(e)};frame(e){let t=this.o.observatory(),n=Math.min(yu,Math.max(0,e-(this.last??e)));this.last=e;let r=this.o.direction===`in`&&!t?.ready,i=Fo(this.o.direction);this.elapsed=r?0:Math.min(i,this.elapsed+(this.skipping?Bo(Math.max(0,i-this.elapsed),n):n));let a=zo(r?0:this.frozen!==null&&!this.skipping?this.frozen*i:this.elapsed,this.o.direction),o={...this.o.seam,up:bu};a.phase!==this.phase&&(this.phase=a.phase,a.phase===`enter`&&t&&(this.obsEnd=this.o.direction===`in`?o:t.getPose()),a.phase===`enter`&&(this.fadeSpace(1),this.o.space?.invalidate(),this.o.space?.step?.(e)),this.o.onPhase(a.phase,this.o.direction));let{guide:s}=this.o,c=a.phase===`dive`&&t?.ready?ds(a.k):null,l=c&&c.grid>0&&c.guide>0&&s?.group.visible&&s.markers.children.length?s.markers:void 0,u=null;if(a.phase===`dive`){l&&(l.visible=!1);try{u=this.applySpace(a,o,e)}finally{l&&(l.visible=!0)}}t?.ready&&(this.applyObservatory(t,a,o,e,u,l),this.observatoryStarted||(this.observatoryStarted=!0,this.o.onObservatoryFrame())),a.done&&!this.finished&&(t?.ready||this.o.direction===`out`)&&this.finish(t)}applySpace({e,k:t},n,r){let{space:i,guide:a}=this.o;if(!a||!this.bridge)return this.fadeSpace(t),i.invalidate(),i.step(r),null;let{camera:o,controls:s}=i,c=Qo(this.spacePose,this.bridge,n,vu),l=ns(this.spacePose,this.bridge,n,{e,k:t},c,vu),u=ts(t),d=dt.lerp(this.spacePose.fov??50,40,u),f=Ho(e,c,vu);i.override.earthRadius=xu*f,i.override.earthBlend=u,this.fadeSpace(t);let[p,m]=ls(t,this.real,this.pyramid),h=us(t,a.length,f,c)/a.length;a.cone.scale.set(p*h,m*h,h),a.setConeRoll(this.roll*ss(t));let g=as(t);a.alignSightLine(g,f,c),a.placeMarkers((e,n)=>{let r=this.o.markerTargets.get(e);return r?cs(this.bridge,n,r,t,c,f):n},g),o.up.set(...l.up),o.position.set(...l.position),s.target.set(...l.target),o.lookAt(s.target);let{near:_,far:v}=fs(o.position.distanceTo(i.sunPos));return o.near=_,o.far=v,o.fov=d,o.updateProjectionMatrix(),i.invalidate(),i.step(r),t>=.6||as(t)===0?null:{position:qo(this.bridge,l.position,f),target:qo(this.bridge,l.target,f),up:Jo(this.bridge,l.up),fov:d}}fadeSpace(e){let{space:t,guide:n}=this.o,r=ds(e);t.override.layerFade=r.layers,t.override.labelFade=Math.min(r.layers,r.labels),Tu(t,n,r.layers,r.labels),t.earth&&(hc(t.earth,r.spaceEarth),t.earth.visible=r.spaceEarth>0),n?.setOpacity(r.guide,r.cone,r.coneFaces,r.spaceAxis)}applyObservatory(e,{phase:t,k:n,photoProgress:r},i,a,o,s){if(e.setExternal(!0),e.setInteractive(!1),e.setProgress(this.o.seamProgress*r),t===`enter`){let t=this.obsEnd,r=Lo(n),a=rs(i,{...t??i,up:bu},r);e.setPose(a.position,a.target,a.up,dt.lerp(40,t?.fov??40,r)),e.setFade({earth:1,pyramid:1,axis:1,photo:1,grid:1},n)}else{let t=ds(n),r=o??i;e.setPose(r.position,r.target,r.up,o?.fov);let a=this.o.guide?t.grid:t.earth,s=this.o.guide?os(n):1;e.setFade({earth:t.earth,pyramid:t.pyramid,axis:t.axis,photo:t.photo,grid:a},0,s)}e.step(a,s&&{object:s,camera:this.o.space.camera})}finish(e){this.finished=!0,this.cancel();let{space:t,guide:n}=this.o;this.o.direction===`in`?e&&(e.setFade({earth:1,pyramid:1,axis:1,photo:1,grid:1}),e.setInteractive(!0),e.setExternal(!1)):Du(t,n,this.spacePose),this.o.onDone(this.o.direction)}},Cu=new WeakMap;function wu(e,t,n=!1){let r=Cu.get(e);if(r&&!n)return r.list;let{list:i,seen:a}=r??{list:[],seen:new Set};return e.scene.traverse(n=>{if(e.earth&&(n===e.earth||Eu(n,e.earth))||t&&(n===t.group||Eu(n,t.group)))return;let r=n.material;for(let e of Array.isArray(r)?r:r?[r]:[]){if(a.has(e))continue;let t=e instanceof Ue&&!!e.uniforms.opacity;(t||e.transparent)&&(a.add(e),i.push({material:e,uniform:t,base:t?e.uniforms.opacity.value:e.opacity,label:n instanceof ce}))}}),Cu.set(e,{list:i,seen:a}),i}function Tu(e,t,n,r=n){for(let{material:i,uniform:a,base:o,label:s}of wu(e,t)){let e=o*(s?Math.min(n,r):n);a?i.uniforms.opacity.value=e:i.opacity=e}e.overlay.style.opacity=String(n)}function Eu(e,t){for(let n=e.parent;n;n=n.parent)if(n===t)return!0;return!1}function Du(e,t,n){let{camera:r,controls:i}=e;if(e.override.camera=!1,e.override.earthRadius=null,e.override.earthBlend=0,e.override.layerFade=1,e.override.labelFade=1,Tu(e,t,1),Cu.delete(e),t&&(t.setOpacity(1,1,1),t.cone.scale.set(t.fieldTan[0],t.fieldTan[1],1),t.alignSightLine(0,1),t.setConeRoll(0),t.placeMarkers()),e.earth&&(hc(e.earth,1),e.earth.visible=!0),r.up.set(...n?.up??bu),n){let e=i.enableDamping;i.enableDamping=!1,i.update(),i.enableDamping=e,r.position.set(...n.position),i.target.set(...n.target)}r.fov=n?.fov??50,r.near=n?.near??.1,r.far=ko,r.updateProjectionMatrix(),r.lookAt(i.target),i.enabled=!0,i.update(),e.invalidate(),e.setExternal(!1)}var Ou=`current`,ku=`current-image`,Au=null,ju=Promise.resolve(),Mu=new Map,Nu=null,Pu=null;function Fu(){return Au!==null}function Iu(e){let t=URL.createObjectURL(e);Mu.set(t,e);for(let e of[...Mu.keys()].slice(0,-3))Mu.delete(e),setTimeout(()=>URL.revokeObjectURL(e),1e4);return t}async function Lu(e){return Mu.has(e)?e:Iu(await(await fetch(e)).blob())}async function Ru(){return new Promise((e,t)=>{let n=indexedDB.open(`tracker-photo`,1);n.onupgradeneeded=()=>n.result.createObjectStore(`projects`),n.onsuccess=()=>e(n.result),n.onerror=()=>t(n.error)})}async function zu(){if(await ju,Au)return Au.project;let e=await Ru(),t,n;try{await new Promise((r,i)=>{let a=e.transaction(`projects`),o=a.objectStore(`projects`),s=o.get(Ou),c=o.get(ku);a.oncomplete=()=>{t=s.result,n=c.result,r()},a.onerror=()=>i(a.error),a.onabort=()=>i(a.error)})}finally{e.close()}if(Au)return Au.project;let r=Ka(t);if(!r)return null;if(r.image){let e={...r,image:await Lu(r.image)};return Nu=null,Bu(e).catch(()=>{}),e}if(!(n instanceof Blob))return null;let i=Pu?.id===r.id&&Mu.has(Pu.url)?Pu.url:null;return i||(i=Iu(n),Pu={id:r.id,url:i}),Nu=i,{...r,image:i}}function Bu(e){let t={project:e};Au=t;let n=ju.then(()=>Vu(e)).then(()=>{Au===t&&(Au=null)});return ju=n.catch(()=>{}),n}async function Vu(e){let t=e&&e.image!==Nu?Mu.get(e.image)??await(await fetch(e.image)).blob():null,n=await Ru();try{await new Promise((r,i)=>{let a=n.transaction(`projects`,`readwrite`),o=a.objectStore(`projects`);e?(o.put({...e,image:``},Ou),t&&o.put(t,ku)):(o.delete(Ou),o.delete(ku)),a.oncomplete=()=>{Nu=e?.image??null,e&&(Pu={id:e.id,url:e.image}),r()},a.onerror=()=>i(a.error),a.onabort=()=>i(a.error)})}finally{n.close()}}var Hu=`.jpg,.jpeg,.png,.webp,.tif,.tiff,.fit,.fits,.fts`;function Uu({session:e,inputRef:t,showButton:n,onActivate:r}){let{project:i,busy:a,ready:o}=e;return(0,Z.jsxs)(`div`,{className:`photo-import`,children:[(0,Z.jsx)(`input`,{ref:t,type:`file`,hidden:!0,accept:Hu,onChange:t=>{let n=t.target.files?.[0];n&&e.upload(n),t.target.value=``}}),(n||a)&&(0,Z.jsx)(`button`,{className:`button small`,onClick:()=>t.current?.click(),disabled:a,children:a?`Rozwiązywanie zdjęcia…`:`Rozłóż zdjęcie`}),n&&!a&&i&&r&&(0,Z.jsx)(`button`,{type:`button`,className:`button small photo-restore`,title:`Pokaż zdjęcie: ${i.name}`,onClick:r,children:(0,Z.jsxs)(`span`,{children:[`Pokaż zdjęcie: `,i.name]})}),a&&(0,Z.jsx)(`button`,{className:`button small`,onClick:e.cancelUpload,children:`Anuluj`}),!i&&o===!1&&(0,Z.jsx)(`span`,{className:`photo-notice`,children:`Astrometria wymaga lokalnego Skyshota.`})]})}function Wu({session:e}){let{error:t,saveError:n}=e;return(0,Z.jsxs)(Z.Fragment,{children:[t&&(0,Z.jsxs)(`div`,{className:`photo-error`,role:`alert`,children:[t,(0,Z.jsx)(re,{label:`Zamknij komunikat`,onClick:e.clearError})]}),n&&!t&&(0,Z.jsxs)(`div`,{role:`status`,className:`photo-error photo-save-error`,children:[n,Fu()&&(0,Z.jsx)(`button`,{className:`button small`,onClick:e.retrySave,children:`Ponów zapis`})]})]})}function Gu({session:e}){let{project:t,activeId:n,setActiveId:r}=e,i=D(e=>e.annotationColors),a=(0,X.useRef)(null),[o,s]=(0,X.useState)({width:800,height:520,bar:63}),c=(0,X.useId)().replace(/:/g,``);if((0,X.useLayoutEffect)(()=>{let e=a.current;if(!e)return;let t=e.parentElement?.querySelector(`.photo-controls`),n=()=>s({width:Math.max(1,e.clientWidth),height:Math.max(1,e.clientHeight),bar:t?.offsetHeight??0});n();let r=new ResizeObserver(n);return r.observe(e),t&&r.observe(t),()=>r.disconnect()},[]),!t)return null;let{width:l,height:u}=o,f=Qa(l,u,t,{top:16,bottom:(o.bar?o.bar+12:0)+16,side:16}),p=new Set(Ja(t.cuts)),m=[...t.cuts].sort((e,t)=>t.radius-e.radius).map(e=>({cut:e,x:f.x+e.x*f.scale,y:f.y+e.y*f.scale,radius:e.radius*f.scale})),h=Za(m);return(0,Z.jsxs)(`svg`,{ref:a,className:`photo-overlay`,viewBox:`0 0 ${l} ${u}`,"aria-label":`Zdjęcie z wycinkami obiektów`,children:[(0,Z.jsx)(`image`,{id:`${c}-image`,href:t.image,width:t.width,height:t.height,transform:`translate(${f.x} ${f.y}) scale(${f.scale})`}),m.map(({cut:e,x:t,y:a,radius:o},s)=>{let c=!p.has(e)&&n!==e.id;return(0,Z.jsxs)(`g`,{children:[(0,Z.jsx)(`circle`,{cx:t,cy:a,r:o,fill:`none`,stroke:n===e.id?`var(--accent)`:i[e.type]??d[e.type],strokeOpacity:c?.5:void 0,strokeWidth:n===e.id?2:1.4,strokeDasharray:h[s]?`5 4`:void 0}),(0,Z.jsx)(`circle`,{cx:t,cy:a,r:o,fill:`none`,stroke:`transparent`,strokeWidth:12,className:`photo-circle`,onClick:()=>r(e.id),children:(0,Z.jsx)(`title`,{children:`${e.id}: ${qa(e)}`})}),(0,Z.jsx)(`text`,{x:t,y:a+o+14,className:c?`photo-label muted`:`photo-label`,children:e.id})]},e.id)})]})}var Ku={FIELD_POPULATION_KINEMATICS:`zbyt duży rozrzut prędkości grupy gwiazd`,NO_SUPPORTED_CLUSTER:`brak spójnej grupy gwiazd`,NO_KINEMATICALLY_COHERENT_CLUSTER:`brak grupy o zgodnych ruchach własnych`,EMPTY_SIGHTLINE:`brak danych o gwiazdach w tym polu`,TOO_FEW_STARS:`zbyt mało gwiazd z odległością`,NO_MATCHED_EXTRAGALACTIC_DISTANCE:`brak dopasowanej odległości galaktyki`};function qu(e,t){if(!(p(e)||e.distanceOrigin===`user`)){if(t?.status===`queued`)return`Regresor: oczekuje w kolejce.`;if(t?.status===`running`)return`Regresor: szacowanie w toku.`;if(t?.result?.status===`error`)return`Regresor: ${t.result.message}`;if(t?.status===`error`||t?.status===`unknown`)return`Regresor: nie udało się odczytać wyniku.`;if(t?.result?.status===`abstain`)return`Regresor: ${Ku[t.result.reason]??`brak podstaw do oszacowania odległości`}.`;if(t?.status===`done`)return`Regresor: oszacowanie nie spełniło kryteriów jakości.`;if(!l.includes(e.type))return`Regresor nie obsługuje tego typu obiektu.`}}function Ju({session:t,regressorJobs:n}){let{project:r,updateCut:i,activeId:a,setActiveId:s,catalogSearch:l,retryCatalogObjects:f}=t,{catalog:m}=A(),h=D(e=>e.annotationColors),g=r?.cuts,_=(0,X.useMemo)(()=>{let e=new Map;for(let t of g??[]){let n=u(t.id)??t.catalogMatch?.kind??(/^PGC \d+$/.test(t.id)?`PGC`:`Inne`),r=e.get(n);r?r.push(t):e.set(n,[t])}return Array.from(e)},[g]),[v,b]=(0,X.useState)(null),[x,S]=(0,X.useState)(0),w=r?.cuts.find(e=>e.id===a),T=w?m?.find(e=>e.id===w.id):void 0,E=w?.catalogMatch?.id===w?.id?void 0:w?.catalogMatch?.id,O=[...new Set([...T?.photoAliases??[],...E?[E]:[]])],ee=w&&(T||!w.catalogMatch)?qu(w,n?.get(w.id)):void 0,j=r&&w?`${r.id}:${w.id}`:``,M=v?.key===j?v.data:null,N=w?.catalogMatch?.distance,te=l?.warnings??r?.catalogObjects?.warnings??[],P=[...N?[N]:[],...M?.measurements??[]],F=P.findIndex(e=>e.distLy===w?.distLy&&e.uncertaintyLy===w?.uncertaintyLy&&e.distanceSource===w?.distanceSource&&e.distanceMethod===w?.distanceMethod);return(0,X.useEffect)(()=>{if(!j||!a)return;let e=new AbortController;return fetch(`/api/photo/distances?${new URLSearchParams({id:a})}`,{signal:e.signal}).then(async e=>{if(!e.ok)throw Error();return await e.json()}).then(t=>{e.signal.aborted||b({key:j,data:t})}).catch(()=>{e.signal.aborted||b({key:j,data:{measurements:[],warnings:[`Nie udało się pobrać źródeł odległości.`]}})}),()=>e.abort()},[j,a,x]),(0,X.useEffect)(()=>{if(!M||!w||!m||T?.unresolved||t.getCurrentProject()!==r)return;let e=C(w,N?[N,...M.measurements]:M.measurements);e&&i(w.id,e)},[M,w,m,T,t,r,N,i]),r?(0,Z.jsxs)(`div`,{className:`photo-editor`,children:[(0,Z.jsxs)(`div`,{className:`photo-editor-heading`,children:[(0,Z.jsx)(`strong`,{children:`Wycinki zdjęcia`}),(0,Z.jsx)(re,{label:`Zamknij edycję wycinków`,onClick:()=>t.setEditing(!1)})]}),(0,Z.jsx)(`p`,{className:`dim`,children:`Obiekty z rozwiązania zdjęcia. Wybierz obiekt z listy albo kliknij obwódkę jego okręgu; zaznacz, które pokazać w 3D. Obiekty bez ustalonej odległości nie trafiają do 3D (na zdjęciu są bledsze).`}),(l?.loading||te.length>0)&&(0,Z.jsxs)(`div`,{"aria-live":`polite`,children:[l?.loading&&(0,Z.jsx)(`p`,{className:`dim`,children:`Pobieranie galaktyk PGC, kwazarów i gromad ACO…`}),te.map(e=>(0,Z.jsx)(`p`,{className:`photo-notice`,children:e},e)),l?.retryable&&(0,Z.jsx)(`button`,{type:`button`,className:`button small`,onClick:f,children:`Ponów pobieranie katalogów`})]}),(0,Z.jsx)(`div`,{className:`photo-object-list`,children:_.map(([e,t])=>(0,Z.jsxs)(`details`,{className:`photo-object-group`,open:!0,children:[(0,Z.jsxs)(`summary`,{children:[e===`M`?`Messier`:Ua[e]??o.find(t=>t.id===e)?.label??e,` `,(0,Z.jsx)(`span`,{className:`dim`,children:t.length})]}),t.map(e=>(0,Z.jsxs)(`div`,{className:`photo-object-row${a===e.id?` active`:``}`,children:[(0,Z.jsx)(`input`,{type:`checkbox`,"aria-label":`Pokaż ${e.id}`,checked:e.enabled&&p(e),disabled:!p(e),title:p(e)?void 0:qu(e,n?.get(e.id))??`Bez ustalonej odległości: obiekt nie trafia do 3D`,onChange:t=>i(e.id,{enabled:t.target.checked})}),(0,Z.jsxs)(`button`,{onClick:()=>s(e.id),children:[(0,Z.jsx)(`span`,{style:{color:h[e.type]??d[e.type]},children:e.id}),(0,Z.jsx)(`small`,{children:e.catalogMatch?.kind===`QSO`?`Kwazar`:e.catalogMatch?.kind===`ACO`?`Gromada gal.`:c[e.type].short})]})]},e.id))]},`${r.id}:${e}`))}),r.cuts.length===0&&(r.catalogObjects||!r.astrometry.wcs)&&(0,Z.jsx)(`p`,{children:`Brak obiektów katalogowych w tym kadrze.`}),w&&(0,Z.jsxs)(`div`,{className:`photo-fields`,children:[(0,Z.jsx)(`strong`,{children:w.id}),!!O.length&&(0,Z.jsx)(`small`,{className:`dim`,children:O.join(`, `)}),(0,Z.jsxs)(`label`,{children:[`Źródło odległości`,(0,Z.jsxs)(`select`,{value:F<0?w.distLy?`saved`:`unknown`:F,title:qa(w),onChange:t=>{if(t.target.value===`unknown`){i(w.id,{...k,distanceOrigin:`user`});return}let n=P[Number(t.target.value)];n&&i(w.id,e(n,`user`))},children:[(0,Z.jsx)(`option`,{value:`unknown`,children:`Brak odległości — bez 3D`}),F<0&&w.distLy&&(0,Z.jsx)(`option`,{value:`saved`,children:qa(w)}),!M&&(0,Z.jsx)(`option`,{disabled:!0,children:`Pobieranie pomiarów…`}),[`Katalog`,`SIMBAD`,`NED`].map(e=>P.some(t=>t.source===e)&&(0,Z.jsx)(`optgroup`,{label:e,children:P.map((t,n)=>t.source===e&&(0,Z.jsx)(`option`,{value:n,title:qa(t),children:qa(t)},n))},e))]})]}),!p(w)&&(0,Z.jsx)(`p`,{className:`photo-notice`,children:w.distLy?`Niepewność powyżej 50 %: obiekt nie trafia do 3D.`:`Bez ustalonej odległości obiekt nie trafia do 3D.`}),w.distanceRef&&(0,Z.jsx)(`a`,{href:`https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(w.distanceRef)}/abstract`,target:`_blank`,rel:`noreferrer`,children:`Publikacja źródłowa ↗`}),(0,Z.jsxs)(`div`,{className:`photo-distance-status`,"aria-live":`polite`,children:[ee&&(0,Z.jsx)(`p`,{className:`photo-notice`,children:ee}),!M&&(0,Z.jsx)(`p`,{className:`dim`,children:`Pobieranie pomiarów…`}),M?.warnings.map(e=>(0,Z.jsx)(`p`,{className:`photo-notice`,children:e},e)),!!M?.warnings.length&&(0,Z.jsx)(`button`,{className:`button small`,onClick:()=>{b(null),S(e=>e+1)},children:`Ponów pobieranie`}),M&&!P.length&&!M.warnings.length&&(0,Z.jsx)(`p`,{className:`photo-notice`,children:`Brak opublikowanych pomiarów w obsługiwanych źródłach.`})]}),(0,Z.jsxs)(`label`,{children:[`Zakres pomiaru`,(0,Z.jsx)(`select`,{value:w.distanceScope,disabled:!w.distLy,onChange:e=>i(w.id,{distanceScope:e.target.value,distanceOrigin:`user`}),children:Object.keys(y).map(e=>(0,Z.jsx)(`option`,{value:e,children:y[e]},e))})]})]}),(0,Z.jsxs)(`details`,{children:[(0,Z.jsx)(`summary`,{children:`Dokładność astrometrii`}),(0,Z.jsxs)(`p`,{children:[r.astrometry.matches,` dopasowań, RMS `,r.astrometry.rmsPx.toFixed(2),` px.`]}),(0,Z.jsxs)(`p`,{children:[`Brzegi: `,r.astrometry.edgeMatches,` dopasowań`,r.astrometry.edgeRmsPx!==null&&`, RMS ${r.astrometry.edgeRmsPx.toFixed(2)} px`,`.`]}),(0,Z.jsx)(`p`,{children:`To reszty dopasowania solvera; wymagają oceny na zdjęciu. Wycinek zawiera także tło i gwiazdy.`})]})]}):null}function Yu({session:e,stars:t,onUnfold:n,onPick:r,onRetryStars:i}){let{project:a,editing:o,setEditing:s}=e;if(!a)return null;let c=Ja(a.cuts).length;return(0,Z.jsxs)(`div`,{className:`photo-controls`,children:[(0,Z.jsxs)(`div`,{className:`photo-heading`,children:[(0,Z.jsx)(`span`,{title:a.name,children:a.name}),(0,Z.jsxs)(`span`,{className:`dim`,children:[t.status===`loading`&&(0,Z.jsx)(`span`,{className:`accent`,children:`Pobieranie gwiazd Gaia DR3… · `}),t.status===`error`&&(0,Z.jsxs)(`span`,{className:`photo-notice`,title:t.message,children:[`Gwiazdy Gaia: błąd · `,(0,Z.jsx)(`button`,{type:`button`,className:`link-button`,onClick:i,children:`ponów`}),` · `]}),c,`/`,a.cuts.length,` obiektów w 3D`]})]}),(0,Z.jsxs)(`div`,{className:`photo-timeline photo-actions`,children:[(0,Z.jsx)(`button`,{type:`button`,className:`button small`,title:`Przejście do Obserwatorium: gwiazdy Gaia i obiekty w swoich odległościach`,onClick:()=>{s(!1),n()},children:`Rozłóż zdjęcie 3D`}),(0,Z.jsx)(`button`,{type:`button`,className:`button small${o?` active`:``}`,"aria-expanded":o,onClick:()=>s(!o),children:`Edytuj wycinki`}),(0,Z.jsx)(`button`,{type:`button`,className:`button small`,onClick:r,disabled:e.busy,children:`Zmień zdjęcie`}),(0,Z.jsx)(`button`,{type:`button`,className:`button small`,onClick:()=>{s(!1),e.change(null)},children:`Usuń`})]})]})}var Xu=`Nie udało się zapisać zmian zdjęcia. Ponów zapis przed zamknięciem aplikacji.`;function Zu(){let[e,t]=(0,X.useState)(null),[n,r]=(0,X.useState)(!0),i=(0,X.useRef)(null),a=(0,X.useRef)(null),o=(0,X.useRef)(null),s=(0,X.useRef)(!1),c=(0,X.useRef)(!0),[l,u]=(0,X.useState)(!1),[d,f]=(0,X.useState)(``),[p,m]=(0,X.useState)(``),[h,g]=(0,X.useState)(null),[_,v]=(0,X.useState)(!1),[y,b]=(0,X.useState)(null),[x,S]=(0,X.useState)(null),[C,w]=(0,X.useState)(0);(0,X.useEffect)(()=>{let e=!0;s.current=!0;let n=new AbortController;return zu().then(n=>{e&&c.current&&((n||Fu())&&(i.current=n,t(n)),Fu()&&m(Xu),r(!1))}).catch(()=>{e&&(m(`Nie udało się odczytać zapisanego zdjęcia.`),r(!1))}),fetch(`/api/photo/status`,{signal:n.signal}).then(e=>e.ok?e.json():null).then(t=>{e&&g(t?.ready===!0)}).catch(()=>{e&&g(!1)}),()=>{e=!1,s.current=!1,n.abort(),a.current?.abort(),o.current&&(clearTimeout(o.current),o.current=null,Bu(i.current).catch(()=>console.warn(`Nie udało się zapisać zmian zdjęcia. Zachowano je w pamięci aplikacji.`)))}},[]);function T(e){Bu(e).then(()=>{s.current&&i.current===e&&m(``)}).catch(()=>{s.current&&i.current===e&&m(Xu)})}function E(e){i.current?.id!==e?.id&&S(null),c.current=!1,r(!1),i.current=e,t(e),o.current&&clearTimeout(o.current),o.current=setTimeout(()=>{o.current=null,T(e)},350)}function D(e,t){let n=i.current;n&&E({...n,cuts:n.cuts.map(n=>n.id===e?{...n,...t}:n)})}let{id:O,width:k,height:ee,astrometry:A}=e??{},j=!!e?.catalogObjects;(0,X.useEffect)(()=>{if(!O||!A?.wcs||l||j)return;let e=new AbortController,t=`Nie udało się pobrać obiektów katalogowych.`,n=!0;return S({loading:!0,retryable:!1,warnings:[]}),fetch(`/api/photo/catalog-objects`,{method:`POST`,headers:{"Content-Type":`application/json`},signal:e.signal,body:JSON.stringify({wcs:A.wcs,width:k,height:ee})}).then(async r=>{let a=await r.json();if(n=r.status!==422,!r.ok)throw Error(a.error||t);let o=i.current;if(e.signal.aborted||o?.id!==O||o.astrometry!==A)return;let s=Wa(o.cuts,a.cuts);(s!==o.cuts||a.complete)&&E({...o,cuts:s,...a.complete&&{catalogObjects:{warnings:a.warnings}}}),!o.cuts.length&&s.length&&b(e=>e??s[0].id),S({loading:!1,retryable:!a.complete,warnings:a.warnings})}).catch(r=>{let a=i.current;!e.signal.aborted&&a?.id===O&&a.astrometry===A&&S({loading:!1,retryable:n,warnings:[r instanceof Error?r.message:t]})}),()=>e.abort()},[O,A,k,ee,l,j,C]);async function M(e){c.current=!1,a.current?.abort(),S(null);let t=new AbortController;a.current=t,u(!0),f(``);try{let n=await fetch(`/api/photo/solve`,{method:`POST`,headers:{"Content-Type":e.type||`application/octet-stream`,"X-Photo-Name":encodeURIComponent(e.name)},body:e,signal:t.signal}),r=await n.json();if(!n.ok)throw Error(r.error??`Nie udało się wczytać zdjęcia.`);let i=await Lu(r.image);t.signal.aborted||(E({...r,image:i}),v(!0),b(r.cuts[0]?.id??null),g(!0))}catch(e){t.signal.aborted||f(e instanceof Error?e.message:`Nie udało się wczytać zdjęcia.`)}finally{a.current===t&&u(!1)}}return{project:e,getCurrentProject:()=>i.current,restoring:n,change:E,updateCut:D,upload:e=>void M(e),cancelUpload:()=>{a.current?.abort(),u(!1)},retryCatalogObjects:()=>w(e=>e+1),catalogSearch:x,busy:l,error:d,clearError:()=>f(``),saveError:p,retrySave:()=>T(i.current),ready:h,editing:_,setEditing:v,activeId:y,setActiveId:b}}function Qu(e,t){let{project:n}=e,r=(0,X.useRef)(e);r.current=e;let[i,a]=(0,X.useState)({status:`idle`}),[o,s]=(0,X.useState)(0),c=!!n&&n.stars===null;return(0,X.useEffect)(()=>{if(!t||!c||!n)return;let e=new AbortController;return a({status:`loading`}),fetch(`/api/photo/stars`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({wcs:n.astrometry.wcs,width:n.width,height:n.height}),signal:e.signal}).then(async t=>{let i=await t.json();if(!t.ok||!i.stars)throw Error(i.error??`Nie udało się pobrać gwiazd Gaia.`);if(e.signal.aborted)return;let o=r.current.getCurrentProject();o?.id===n.id&&o.astrometry===n.astrometry&&(r.current.change({...o,stars:{stars:i.stars,magLimit:i.magLimit??0,fetchedAt:Date.now()}}),a({status:`idle`}))}).catch(t=>{let i=r.current.getCurrentProject();!e.signal.aborted&&i?.id===n.id&&i.astrometry===n.astrometry&&a({status:`error`,message:t.message})}),()=>{e.abort(),a({status:`idle`})}},[n?.id,n?.astrometry,c,t,o]),{stars:i,retry:()=>s(e=>e+1)}}function $u(e){let{indexed:t}=A(),n=(0,X.useMemo)(()=>t&&new Map(t.map(e=>[e.id,e])),[t]),{project:r}=e,i=(0,X.useRef)(e);i.current=e,(0,X.useEffect)(()=>{if(!r||!t||!n)return;let e=i.current,a=e.getCurrentProject();if(a?.id!==r.id||a.astrometry!==r.astrometry)return;let o=j(a,t,n);if(o!==a){let t=e.activeId&&n.get(e.activeId)?.photoPrimaryId;t&&o.cuts.some(e=>e.id===t)&&e.setActiveId(t),e.change(o)}},[r,t,n])}var ed=new Map,td=40,nd=e=>[...e.values()].some(e=>e.status===`running`)?`running`:`queued`;function rd(e,t){let{indexed:n}=A(),r=(0,X.useMemo)(()=>n&&new Map(n.map(e=>[e.id,e])),[n]),[i,a]=(0,X.useState)(null),[o,s]=(0,X.useState)(null),c=(0,X.useRef)(o),l=(0,X.useRef)(e);l.current=e;let{project:u}=e,d=(0,X.useMemo)(()=>u&&n&&r?u.cuts.filter(e=>{let i=r.get(e.id);return i&&!i.photoPrimaryId&&ee(e,i)&&(!i.illuminator||u.stars!==null||t)&&b(i,u.stars?.stars??null,n[i.illuminator?.cluster??-1]??null).distLy===null}):[],[u,n,r,t]),f=d.map(e=>e.id).join(`|`);if((0,X.useEffect)(()=>{let e=new AbortController;return fetch(`/api/photo/regressor`,{signal:e.signal}).then(e=>e.ok?e.json():null).then(t=>{e.signal.aborted||a(t?.ready===!0)}).catch(()=>{e.signal.aborted||a(!1)}),()=>e.abort()},[]),(0,X.useEffect)(()=>{if(!u||i===null||!d.length)return;let e=c.current?.projectId===u.id&&c.current.astrometry===u.astrometry?c.current.jobs:ed,t=d.filter(t=>{let n=e.get(t.id);return!n||n.status===`queued`||n.status===`running`});if(!t.length)return;let n=t.map(e=>e.id),a=t=>{let n={projectId:u.id,astrometry:u.astrometry,jobs:new Map([...e,...t])};c.current=n,s(n)};if(!i){a(new Map(n.map(e=>[e,{key:``,status:`error`,result:{status:`error`,message:`Usługa jest niedostępna.`}}])));return}let o=vo(u.astrometry.wcs,u.width,u.height);if(!o)return;let f=o.widthDeg/u.width,p=new AbortController,m,h=e=>{let t=l.current.getCurrentProject();if(t?.id!==u.id||t.astrometry!==u.astrometry||p.signal.aborted)return!1;let n=!1,i=t.cuts.map(t=>{let i=e.get(t.id),a=i?.status===`done`?i.result:void 0,o=a&&ee(t,r?.get(t.id))?O(a,t.raDeg,t.decDeg):null;return o?(n=!0,{...t,...o}):t});return n&&l.current.change({...t,cuts:i}),a(e),[...e.values()].some(e=>e.status===`queued`||e.status===`running`)},g=null,_=(e,t)=>{g=w(g,t),v(e,g)},v=(e,t)=>{m=setTimeout(()=>{if(document.hidden){let n=()=>{document.removeEventListener(`visibilitychange`,n),p.signal.aborted||v(e,t)};document.addEventListener(`visibilitychange`,n),p.signal.addEventListener(`abort`,()=>document.removeEventListener(`visibilitychange`,n));return}let n=[...e].filter(([,e])=>e.status===`queued`||e.status===`running`),r=n.map(([,e])=>e.key),i=Array.from({length:Math.ceil(r.length/td)},(e,t)=>r.slice(t*td,(t+1)*td));Promise.all(i.map(e=>fetch(`/api/photo/regressor?${new URLSearchParams({keys:e.join(`,`)})}`,{signal:p.signal}).then(e=>{if(!e.ok)throw Error(`HTTP ${e.status}`);return e.json()}))).then(t=>{let r=t.flatMap(e=>e.jobs),i=new Map(e);n.forEach(([e],t)=>i.set(e,r[t])),h(i)&&_(i,nd(i))}).catch(()=>{p.signal.aborted||_(e,`error`)})},t)},y=t.map(e=>({raDeg:e.raDeg,decDeg:e.decDeg,radiusDeg:Math.min(2,Math.max(.001,e.radius*f)),type:e.type})),b=Array.from({length:Math.ceil(y.length/td)},(e,t)=>y.slice(t*td,(t+1)*td));return Promise.all(b.map(e=>fetch(`/api/photo/regressor`,{method:`POST`,headers:{"Content-Type":`application/json`},signal:p.signal,body:JSON.stringify({targets:e,group:u.id})}).then(e=>{if(!e.ok)throw Error(`HTTP ${e.status}`);return e.json()}).catch(()=>({jobs:e.map(()=>({key:``,status:`error`,result:{status:`error`,message:`Nie udało się zgłosić wycinka.`}}))})))).then(e=>{let t=new Map(e.flatMap(e=>e.jobs).map((e,t)=>[n[t],e]));h(t)&&_(t,nd(t))}),()=>{p.abort(),clearTimeout(m)}},[i,u?.id,u?.astrometry,f]),!o||o.projectId!==u?.id||o.astrometry!==u.astrometry)return ed;let p=new Map;for(let e of d){let t=o.jobs.get(e.id);t&&p.set(e.id,t)}return p}function id({project:e,cut:t}){let{x:n,y:r,side:i}=Ya(t,e.width,e.height);return(0,Z.jsx)(`svg`,{className:`pw-thumb`,viewBox:`${n} ${r} ${i} ${i}`,"aria-label":`Wycinek ${t.id}`,role:`img`,children:(0,Z.jsx)(`image`,{href:e.image,width:e.width,height:e.height,preserveAspectRatio:`none`})})}function ad({cuts:e,project:t,activeId:n,onChoose:r,onHover:i}){let a=(0,X.useRef)(null),o=pn({count:e.length,getScrollElement:()=>a.current,estimateSize:()=>40,overscan:6}),s=e.findIndex(e=>e.id===n);return(0,X.useEffect)(()=>{s>=0&&o.scrollToIndex(s,{align:`auto`})},[s,o]),(0,Z.jsx)(`div`,{ref:a,className:`pw-list`,role:`listbox`,"aria-label":`Obiekty zdjęcia według odległości`,onPointerLeave:()=>i(null),children:(0,Z.jsx)(`div`,{style:{height:o.getTotalSize(),position:`relative`},children:o.getVirtualItems().map(a=>{let o=e[a.index];return(0,Z.jsxs)(`div`,{role:`option`,"aria-selected":o.id===n,className:`pw-row${o.id===n?` on`:``}`,style:{transform:`translateY(${a.start}px)`,height:a.size},title:qa(o),onClick:()=>r(o.id),onPointerEnter:()=>i(o.id),children:[(0,Z.jsx)(id,{project:t,cut:o}),(0,Z.jsx)(`span`,{className:`pw-row-name`,children:o.id}),(0,Z.jsx)(`span`,{className:`pw-row-dist figures`,children:I(o.distLy)})]},o.id)})})})}function od({session:e,guideRef:t,scale:n,visible:r=!0}){let{project:i,editing:a,activeId:o,setActiveId:s}=e,[c,l]=(0,X.useState)(``),[u,d]=(0,X.useState)(!1),f=(0,X.useMemo)(()=>Ja(i?.cuts??[]).sort((e,t)=>e.distLy-t.distLy||e.id.localeCompare(t.id)),[i?.cuts]),p=c.trim().toLocaleLowerCase(),m=(0,X.useMemo)(()=>p?f.filter(e=>e.id.toLocaleLowerCase().includes(p)):f,[f,p]),h=o?f.find(e=>e.id===o):void 0;return(0,X.useEffect)(()=>{d(!1)},[o,n,i?.id]),!i||a||!r?null:(0,Z.jsxs)(`aside`,{className:`photo-window-panel`,"aria-label":`Obiekty zdjęcia w przestrzeni`,children:[(0,Z.jsxs)(`div`,{className:`pw-heading`,children:[(0,Z.jsx)(`span`,{className:`pw-eyebrow`,children:`OBIEKTY ZDJĘCIA`}),(0,Z.jsxs)(`strong`,{children:[f.length,` `,f.length===1?`obiekt`:`obiektów`,` w przestrzeni`]}),f.length>0&&(0,Z.jsxs)(`span`,{className:`pw-meta`,children:[`≈ `,ie(f[0].distLy,f[f.length-1].distLy)]})]}),f.length>6&&(0,Z.jsx)(`input`,{className:`pw-search`,type:`search`,placeholder:`Znajdź obiekt…`,"aria-label":`Znajdź obiekt na zdjęciu`,value:c,onChange:e=>l(e.target.value)}),m.length>0&&(0,Z.jsx)(ad,{cuts:m,project:i,activeId:o,onChoose:s,onHover:e=>t?.current?.setHover(e)}),f.length>0&&!m.length&&(0,Z.jsx)(`p`,{className:`pw-note`,children:`Brak obiektów pasujących do wyszukiwania.`}),h&&(0,Z.jsxs)(`section`,{className:`pw-selection`,"aria-label":`Wybrany obiekt`,children:[(0,Z.jsxs)(`div`,{className:`pw-selected`,children:[(0,Z.jsx)(`button`,{type:`button`,className:`pw-zoom`,onClick:()=>{h&&(u?(t?.current?.frameCamera(),d(!1)):(t?.current?.focus(h.id),d(!0)))},"aria-label":u?`Oddal widok`:`Przybliż obiekt`,title:u?`Oddal widok`:`Przybliż obiekt`,children:u?(0,Z.jsx)(wn,{size:15,"aria-hidden":!0}):(0,Z.jsx)(Sn,{size:15,"aria-hidden":!0})}),(0,Z.jsx)(id,{project:i,cut:h}),(0,Z.jsxs)(`div`,{className:`pw-selected-meta`,children:[(0,Z.jsx)(`strong`,{children:h.id}),(0,Z.jsxs)(`span`,{className:`figures`,children:[`≈ `,I(h.distLy)]})]})]}),(0,Z.jsx)(`p`,{children:qa(h)})]}),!f.length&&(0,Z.jsx)(`p`,{className:`pw-note`,children:`Włącz wycinki z ustaloną odległością w edytorze, aby pokazać zdjęcie w przestrzeni.`})]})}var sd=[{id:`galaxy`,label:`Droga Mleczna`},{id:`universe`,label:`Wszechświat lokalny`}];function cd({o:e,settings:t,onScale:n,onConstellationView:r,crumb:i,children:a}){let{scale:o,showConstellations:s,constellations:l}=t,{catalog:u}=A(),[d,f]=(0,X.useState)(!1);(0,X.useEffect)(()=>{if(!d)return;let e=window.setTimeout(()=>f(!1),1e4);return()=>window.clearTimeout(e)},[d]);let p=(0,X.useMemo)(()=>u?u.filter(e=>e.distLy!==null):[],[u]),m=(0,X.useMemo)(()=>{let e=new Map;for(let t of p)t.distLy<15e4&&e.set(t.type,(e.get(t.type)??0)+1);return Object.keys(c).filter(t=>e.has(t)).map(t=>({type:t,count:e.get(t)}))},[p]),h=e?.distLy??null,g=o===`galaxy`&&h!==null&&h>15e4;return(0,Z.jsxs)(`div`,{className:`obs-toolbar space-toolbar`,children:[(0,Z.jsx)(`div`,{className:`obs-tabs`,role:`tablist`,"aria-label":`Skala widoku 3D`,children:sd.map(e=>(0,Z.jsx)(`button`,{type:`button`,role:`tab`,"aria-selected":o===e.id,className:`toggle-chip${o===e.id?` on`:``}`,onClick:()=>n(e.id),children:e.label},e.id))}),i&&(0,Z.jsxs)(`span`,{className:`space-crumb figures`,title:i,children:[o===`galaxy`?`Droga Mleczna`:`Wszechświat lokalny`,` › `,i]}),!i&&o===`galaxy`&&s&&(0,Z.jsxs)(`div`,{className:`space-filters`,children:[(0,Z.jsx)(mn,{value:t.constellationChoice,onChange:t.setConstellationChoice,options:(l?.constellations??[]).map(e=>({value:e.abbr,label:F[e.abbr]??e.abbr})).sort((e,t)=>e.label.localeCompare(t.label,`pl`))}),(0,Z.jsx)(`button`,{type:`button`,className:`toggle-chip`,"aria-label":`Pokaż gwiazdozbiór z Ziemi`,title:t.constellationChoice===`all`?`Wybierz jeden gwiazdozbiór`:`Pokaż gwiazdozbiór z Ziemi. Kliknij ponownie, aby wrócić.`,disabled:!r||t.constellationChoice===`all`,onClick:()=>r?.(t.constellationChoice),children:(0,Z.jsx)(Lt,{size:14})})]}),a,(0,Z.jsx)(`span`,{className:`obs-spacer`}),!i&&(0,Z.jsxs)(`div`,{className:`space-toolbar-end`,children:[(0,Z.jsxs)(`div`,{className:`scale-info-control`,children:[(0,Z.jsx)(`button`,{className:`scale-info-button`,title:`Informacje o skali`,"aria-label":`Informacje o skali`,"aria-expanded":d,"aria-controls":`scale-info-popover`,onClick:()=>f(e=>!e),children:`i`}),d&&(0,Z.jsxs)(`div`,{id:`scale-info-popover`,className:`scale-info-popover`,role:`note`,"aria-label":`Opis skali i źródła danych`,children:[(0,Z.jsx)(`p`,{children:h===null?`Wikidata nie podaje odległości tego obiektu - pokazany jest tylko kierunek ze Słońca.`:g?`Obiekt (${I(h)}) leży poza zasięgiem tej skali - pokazany jest tylko kierunek ze Słońca. Jego położenie: Wszechświat lokalny.`:o===`galaxy`?`Skala liniowa, 1 j. = 1000 lś. Punkty: ${p.filter(e=>e.distLy<15e4).length} obiektów katalogu z odległością.`:`Skala odległości logarytmiczna. Modele Grupy Lokalnej zachowują proporcje rozmiarów względem Drogi Mlecznej; pozostałe galaktyki to punkty w kolorach typów obiektów.`}),(0,Z.jsxs)(`p`,{children:[`Odległości: Wikidata (mediana wartości). Morfologia: NED, NASA, NAOJ. Modele poglądowe.`,o===`galaxy`&&` Ziemia poza skalą; orientacja osi J2000, obrót poglądowy.`]}),o===`galaxy`&&s&&(0,Z.jsx)(`p`,{children:`Cyjanowe linie: gwiazdozbiory (Stellarium). Odległości gwiazd: szacunki z paralaks Hipparcosa (CDS I/239); brak dodatniej paralaksy przerywa linię.`})]})]}),(0,Z.jsx)(it,{threeD:!0,settings:t,typeCounts:m})]})]})}function ld({label:e,kicker:t,title:n,subtitle:r,summaryRef:i,summary:a,className:o=``,style:s,onClose:c,children:l}){let u=(0,X.useRef)(null),d=(0,X.useRef)(c);return d.current=c,(0,X.useEffect)(()=>{let e=document.activeElement instanceof HTMLElement&&document.activeElement!==document.body?document.activeElement:null;u.current?.querySelector(`.obs-header .close-button`)?.focus();let t=e=>{e.key===`Escape`&&d.current()};return window.addEventListener(`keydown`,t),()=>{window.removeEventListener(`keydown`,t),(e?.isConnected?e:document.querySelector(`[data-space3d-opener]`))?.focus({preventScroll:!0})}},[]),(0,Tn.createPortal)((0,Z.jsx)(`div`,{ref:u,className:`observatory`,role:`dialog`,"aria-modal":`true`,"aria-label":e,children:(0,Z.jsxs)(`div`,{className:`obs-window card ${o}`,style:s,children:[(0,Z.jsxs)(`header`,{className:`obs-header`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`div`,{className:`kicker`,children:t}),(0,Z.jsx)(`div`,{className:`obs-title`,title:n,children:n}),(0,Z.jsx)(`div`,{className:`dim`,children:r})]}),(0,Z.jsx)(`div`,{ref:i,className:`obs-summary figures`,children:a}),(0,Z.jsx)(`div`,{className:`obs-header-actions`,children:(0,Z.jsx)(re,{label:`Zamknij okno Pozycja 3D`,onClick:c})})]}),l]})}),document.body)}var ud={galaxy:`Droga Mleczna · skala liniowa, 1 j. = 1000 lś`,universe:`Wszechświat lokalny · odległości w skali logarytmicznej`},dd=()=>matchMedia(`(prefers-reduced-motion: reduce)`).matches;function fd(){let e=Zu();return e.restoring?null:(0,Z.jsx)(pd,{session:e})}function pd({session:e}){let t=D(e=>e.setSpace3DOpen),n=(0,X.useCallback)(()=>t(!1),[t]),r=x(),i=e.project,[a,o]=(0,X.useState)(!0),[s,c]=(0,X.useState)(i?.id),l=s!==i?.id;l&&(c(i?.id),o(!0));let u=l||a,d=u?i:null,{setEditing:f}=e,p=(0,X.useCallback)(()=>o(!0),[]),m=(0,X.useCallback)(()=>{o(!1),f(!1)},[f]),h=Yt(r,i,u);$u(e);let g=(0,X.useRef)(null),[_,v]=(0,X.useState)(null),[y,b]=(0,X.useState)(`scale`),[S,C]=(0,X.useState)(!1),w=(0,X.useRef)(null),T=(0,X.useRef)(null),E=(0,X.useRef)(null),[O,k]=(0,X.useState)(null),[ee,A]=(0,X.useState)(null),[j,M]=(0,X.useState)(null),N=h.scale===`galaxy`,te=y===`in`||y===`out`,[P,F]=(0,X.useState)(!1),[ne,re]=(0,X.useState)(!1),{stars:ie,retry:ae}=Qu(e,!!d&&(N||e.editing||P||y!==`scale`)),L=rd(e,ie.status===`error`),oe=[...L.values()].filter(e=>e.status===`queued`||e.status===`running`).length;(0,X.useEffect)(()=>{F(!1),re(!1)},[i?.id]);let[R,se]=(0,X.useState)(i);(0,X.useEffect)(()=>{(y===`photo`||y===`scale`&&!e.editing)&&se(i)},[i,y,e.editing]),(0,X.useEffect)(()=>{if(!d||P||y!==`scale`||e.editing||dd()||!_)return;let t=0,n=_.afterFlight(()=>{t=window.requestIdleCallback?.(()=>F(!0),{timeout:3e3})??window.setTimeout(()=>F(!0),1e3)});return()=>{n(),window.cancelIdleCallback?window.cancelIdleCallback(t):window.clearTimeout(t)}},[d,P,y,e.editing,_]);let z=y===`scale`&&!!d&&e.editing,ce=Uc(_,d,h.scale,y!==`photo`&&!z,e.activeId,e.setActiveId,y!==`photo`,te||z),B=(0,X.useCallback)(()=>ce.current,[ce]),V=(0,X.useCallback)((e,t=w.current?.spacePose??T.current?.pose??null)=>{w.current?.cancel(),w.current=null;let n=E.current;e===`photo`&&n&&(n.setProgress(1),n.setFade({earth:1,pyramid:1,axis:1,photo:1,grid:1}),n.setInteractive(!0),n.setExternal(!1),n.setView(`structure`,!1)),e===`scale`&&(_&&Du(_,B(),t),n?.setExternal(!0)),b(e),C(e===`photo`)},[_,B]),le=(0,X.useCallback)(e=>{e===`in`&&re(!1);let t=B(),n=T.current?.pose??null;if(e===`out`&&T.current?.scale!==h.scale){let e=t?.getFramePose();n=e?{...e,up:[0,1,0]}:null}if(!d||!_||!t||dd()){if(_&&e===`in`&&d){_.stopIntro();let{camera:e,controls:t}=_;T.current={scale:h.scale,pose:{position:e.position.toArray(),target:t.target.toArray(),up:e.up.toArray(),fov:e.fov,near:e.near}},_.setExternal(!0),se(d),F(!0)}V(e===`in`?`photo`:`scale`,n);return}se(d),F(!0);let r=ro(d),i=io(r.map(e=>e.distLy)),a=e===`out`?E.current?.getProgress()??1:1,o=new Map(r.filter(e=>e.kind===`object`&&e.distLy!==null).map(e=>[e.id,co(e,d,e.distLy,i,0)])),s=new Su({direction:e,space:_,guide:t,observatory:()=>E.current,seam:xo(r,d,i),markerTargets:o,seamProgress:a,imageAspect:d.height/d.width,spacePose:e===`out`?n??void 0:void 0,onPhase:(e,t)=>{e===`enter`&&C(t===`in`)},onObservatoryFrame:()=>re(!0),onDone:e=>{w.current=null,b(e===`in`?`photo`:`scale`)}});e===`in`&&(T.current={scale:h.scale,pose:s.spacePose}),w.current=s,b(e)},[d,_,B,h.scale,V]);function H(){e.setEditing(!1),le(`in`)}let[ue,de]=(0,X.useState)(null),[fe,pe]=(0,X.useState)(!1);(0,X.useEffect)(()=>{let e=0,t=requestAnimationFrame(()=>{e=window.setTimeout(()=>pe(!0))});return()=>{cancelAnimationFrame(t),window.clearTimeout(e)}},[]);let{setScale:me}=h;(0,X.useEffect)(()=>{ue&&(y===`photo`&&h.scale===ue?(de(null),le(`out`)):y===`scale`&&(de(null),me(ue)))},[y,ue,h.scale,me,le]);function he(e){let t=md(y,h.scale,e);t.type===`set-scale`?me(t.scale):t.type===`dive-out`?t.scale===h.scale?le(`out`):(me(t.scale),de(t.scale)):(de(t.then),t.type===`reverse-or-cancel`&&(w.current?.reverse()?(b(`out`),C(!1)):V(`scale`)))}(0,X.useEffect)(()=>{_&&(w.current&&V(y===`out`?`scale`:`photo`),(y===`photo`||y===`in`)&&(_.stopIntro(),_.setExternal(!0)))},[_]),(0,X.useEffect)(()=>()=>w.current?.cancel(),[]),(0,X.useEffect)(()=>{},[_]),(0,X.useEffect)(()=>{!d&&y!==`scale`&&V(`scale`)},[d,y,V]),(0,X.useEffect)(()=>{if(_&&z)return _.setExternal(!0),()=>{w.current||_.setExternal(!1)}},[_,z]),(0,X.useEffect)(()=>{if(!te)return;let e=e=>{hd(e)&&w.current?.skip()};return window.addEventListener(`click`,e,!0),window.addEventListener(`keydown`,e,!0),()=>{window.removeEventListener(`click`,e,!0),window.removeEventListener(`keydown`,e,!0)}},[te]);let ge=S&&!!d,U=r?.distLy??null;return(0,Z.jsxs)(ld,{label:ge?`Obserwatorium 3D zdjęcia`:`Pozycja 3D`,kicker:ge?`KONUZASTRO / Obserwatorium 3D`:`KONUZASTRO / Pozycja 3D`,title:d?d.name:r?`${r.id}${r.namePl?` · ${r.namePl}`:``}`:`Wybierz obiekt`,subtitle:ge?`Obiekty zdjęcia wzdłuż linii widzenia`:ud[h.scale],summaryRef:M,summary:!ge&&!d&&r?(0,Z.jsx)(`strong`,{children:U===null?`Odległość nieznana`:`Odległość ≈ ${I(U)}`}):null,className:`space-window ${S?`is-photo`:`is-scale`}${te?` is-diving`:``}${z?` is-editing`:``}`,style:te?{"--dive-enter":`${Po[y].enter}ms`}:void 0,onClose:n,children:[(0,Z.jsxs)(cd,{o:r,settings:ue?{...h,scale:ue}:h,onScale:he,crumb:ge?d.name:void 0,onConstellationView:_&&y===`scale`&&!z?_.viewConstellation:void 0,children:[ge&&(0,Z.jsx)(`div`,{ref:A,className:`space-toolbar-slot`}),oe>0&&(0,Z.jsxs)(`div`,{className:`photo-regressor-progress`,children:[(0,Z.jsxs)(`span`,{children:[`Regresor · w toku: `,oe]}),(0,Z.jsx)(`progress`,{"aria-label":`Szacowanie odległości przez regresor`})]})]}),(0,Z.jsxs)(`div`,{ref:k,className:`obs-stage space-stage`,children:[(0,Z.jsx)(`div`,{className:`space-scene${y===`photo`||z?` is-hidden`:``}`,children:fe&&(0,Z.jsx)(_u,{settings:h,photo:d,onSelectObject:m,onHandle:v})}),d&&(0,Z.jsx)(od,{session:e,scale:h.scale,visible:y===`scale`,guideRef:ce},d.id),y===`scale`&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(Uu,{session:e,inputRef:g,showButton:!d,onActivate:p}),(0,Z.jsx)(Wu,{session:e}),d&&(0,Z.jsx)(Yu,{session:e,stars:ie,onUnfold:H,onPick:()=>g.current?.click(),onRetryStars:ae}),z&&(0,Z.jsx)(Gu,{session:e})]})]}),z&&(0,Z.jsx)(Ju,{session:e,regressorJobs:L}),(P||y!==`scale`)&&R&&O&&j&&(0,Z.jsx)(fl,{project:R,slots:{stage:O,toolbar:ge?ee:null,summary:ge?j:null},stars:ie,onRetryStars:ae,diving:te,hidden:y===`scale`||y===`in`&&!ne,onScene:e=>{E.current=e}})]})}function md(e,t,n){if(e===`scale`)return{type:`set-scale`,scale:n};if(e===`photo`)return{type:`dive-out`,scale:n};let r=n===t?null:n;return e===`in`?{type:`reverse-or-cancel`,then:r}:{type:`after-return`,then:r}}function hd(e){if(e.key===`Escape`)return!1;let t=e.target,n=t&&typeof t.closest==`function`?t:t?.parentElement;return!(n&&typeof n.closest==`function`&&n.closest(`button, a, input, select, textarea, [role="button"], .obs-toolbar, .obs-header`))}export{fd as default};