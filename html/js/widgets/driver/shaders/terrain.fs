
#define BLENDAREA 0.1

#define BLENDLIMITSTART 0.99
#define BLENDLIMITEND 0.93

#define BLENDSCALE (BLENDLIMITSTART - BLENDLIMITEND)

// Texture loading
vec4 dRock = texture2D( tRock, vUv * 0.7); // vec4(1.0, 0.0, 0.0, 1.0); //
vec4 dRock2 = texture2D( tRock2, vUv * 0.2);
vec4 dRock3 = texture2D( tRock2, vUv * 0.9 + 0.5);
vec4 dGrass = texture2D( tGrass, vUv); // vec4(1.0, 1.0, 1.0, 1.0); //
vec4 dGrass2 = texture2D( tGrass2, vUv * 0.3); // vec4(1.0, 0.0, 0.0, 1.0); //
vec4 dGrass3 = texture2D( tGrass3, vUv * 0.8); // 

// Shadow cloud
vec4 dCloud = texture2D( tCloudShadow, (vUv / offsetRepeat[2]) + time); // vec4(1.0, 1.0, 1.0, 1.0); //

// Use cloud texture also for blending
vec4 dVariation = texture2D( tCloudShadow, (vUv / (offsetRepeat[2] / 5.0) )); // small area
vec4 dVariation2 = texture2D( tCloudShadow, (vUv / (offsetRepeat[2] / 10.0) )); // middle area
vec4 dVariation3 = texture2D( tCloudShadow, (vUv / (offsetRepeat[2] / 30.0) )); // large area

// comparsion with up vector
float ups = dot(normalize(vNormal), vec3(0.0, 1.0, 0.0));

// Determine steep areas
if(ups < BLENDLIMITSTART)
{
    // 0 is edge, 1 is surface
    float p = (max(BLENDLIMITEND, ups) - BLENDLIMITEND) / BLENDSCALE;

    if(p <= BLENDAREA)
    {
        // fully steep area
        ups = 0.0; 
    }
    else 
    {
        // edge to steep area

        // calculate simplex noise 0 - 1.0
        float edgenoise = 0.5 + 0.5 * snoise(vUv);

        // Blend steep area by mixing in a noise
        p = (p - BLENDAREA) * (1.0+BLENDAREA);
        ups = mix(0.0, edgenoise, p );
        ups = mix(ups, 1.0, p );
    }
}

// mix Grass
vec4 colorGrass = dGrass;
colorGrass = mix(colorGrass, dGrass2, dVariation2.g); // variation
colorGrass = mix(colorGrass, dGrass3, dVariation3.g); // variation
colorGrass.g += dVariation.g * 0.05; // add variation to green channel

// mix Rock
vec4 colorRock = dRock;
colorRock = mix(colorRock, dRock3, dVariation3.g); // variation
colorRock = mix(colorRock, dRock2, dVariation2.g); // variation
colorRock.r += dVariation.r * 0.05; // add variation to red channel
colorRock.b += dVariation2.b * 0.05; // add variation to blue channel

// mix steep areas
vec4 color = mix(colorRock, colorGrass, ups);

// add cloud shadow
color.rgb -= dCloud.rgb * 0.3;

// result
gl_FragColor = gl_FragColor * color;
