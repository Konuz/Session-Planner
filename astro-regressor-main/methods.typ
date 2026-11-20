#set page(
  paper: "a4",
  margin: (x: 1.7cm, top: 1.5cm, bottom: 1.5cm),
  numbering: "1 / 1",
)
#set text(
  font: ("New Computer Modern", "Libertinus Serif", "Times New Roman"),
  size: 9.2pt,
)
#set par(justify: true, leading: 0.52em)

// Clickable LaTeX/hyperref-style links and citations
#show ref: it => {
  set text(fill: rgb("#00509d"), weight: "semibold")
  it
}
#show link: it => {
  set text(fill: rgb("#00509d"))
  underline(stroke: 0.4pt + rgb("#00509d"), it)
}

#show heading: it => block(above: 0.9em, below: 0.4em)[
  #set text(weight: "bold")
  #it
]

#align(center)[
  #text(size: 13.5pt, weight: "bold")[
    astro-regressor: Metody, Równania i Praktyka Astronomiczna \
    Methods, Equations & Standard Practice in Astronomy
  ]
  #v(0.25em)
  #text(size: 9.5pt)[Kacper Kania (#link("https://github.com/kacperkan")[`kacperkan`])]
]

#v(0.2em)

= Wersja polska (PL)

== 1. Metody i równania użyte w repozytorium

1. *Kosmologia $Lambda$CDM i moduły odległości Cosmicflows-4 (obiekty pozagalaktyczne, `catalogs.py`, `estimators.py`, `distance.py`)* — dla galaktyk i kwazarów łączone są bezpośrednie moduły odległości $"DM"$ z katalogu *Cosmicflows-4* (`J/ApJ/944/94/table2`, $d_"Mpc" = 10^(("DM" - 25)\/5)$) @tully2023 oraz przesunięcia ku czerwieni $z > 0.0005$ z SDSS DR17 @abdurrouf2022sdss (po transformacji $z_"helio" -> z_"CMB"$ względem dipola Plancka dla $z < 0.05$) całkowane z parametrami *Planck 2018* ($H_0 = 67.66 "km s"^(-1) "Mpc"^(-1)$, $Omega_(m,0) = 0.30966$) @planck2020 @hogg1999:
   $ d_C (z) = c / H_0 integral_0^z (dif z') / sqrt(Omega_(m,0) (1 + z')^3 + Omega_(Lambda,0)), quad d_L (z) = (1 + z) d_C (z), quad d_A (z) = d_C (z) / (1 + z). $

2. *Bayesowska odległość fotogeometryczna, StarHorse i oficjalna kalibracja zero-point (pojedyncze gwiazdy, `catalogs.py`, `distance.py`)* — proste odwrócenie paralaksy $d = 1 / ϖ$ daje obciążenie Lutza–Kelkera przy $sigma_ϖ / ϖ gt.tilde 0.2$ @luri2018. Po odrzuceniu układów podwójnych ($"RUWE" < 1.4$) i odjęciu opublikowanego offsetu Lindegrena (`gaiadr3-zeropoint`, 5p/6p) $ϖ_"corr" = ϖ - Z_(5\/6)(G, nu_"eff", hat(nu), beta)$ @lindegren2021 łączone są rozkłady a posteriori Bailera-Jonesa @bailerjones2021 @gaia2023dr3, spektrofotometryczne odległości *StarHorse* (`I/354/starhorse2021`) @anders2022 oraz izochrony *GSP-Phot* @creevey2023:
   $ P(r mid(|) ϖ, sigma_ϖ, G, G_"BP" - G_"RP", l, b) prop P(ϖ mid(|) r, sigma_ϖ) P(G mid(|) r, G_"BP" - G_"RP", l, b) P(r mid(|) l, b). $

3. *5D klasteryzacja HDBSCAN / UPMASK, hierarchiczna paralaksa, ekstynkcja NICER i skok pyłu 3D (gromady, mgławice i globule LDN, `estimators.py`)* — dla obiektów rozciągłych mod KDE ($h = 0.12 "dex"$) w $u_i = log_10 (r_("med,photogeo", i))$ @scott2015 inicjuje dobór członków w 5D $(alpha, delta, mu_alpha^*, mu_delta, ϖ_"corr")$ za pomocą `HDBSCAN` @hunt2023, astrometrycznego *UPMASK* (PCA + $k$-means + test losowości przestrzennej 2D KDE względem 200 pól losowych + losowanie Monte Carlo z pełnej macierzy kowariancji błędów astrometrycznych) @kronemartins2014 @cantatgaudin2018 lub filtru MAD, a odległość systemowa $theta_d$ maksymalizuje wiarygodność $product_i cal(N)(ϖ_("corr", i) mid(|) 1000 / theta_d, sigma_(ϖ, i)^2 + sigma_"int"^2)$. Dla ciemnych mgławic Lynds (`LDN`) @lynds1962 i globul Boka gwiazdy tła odzyskiwane są metodą *NICER/NICEST* @lombardi2001 @lombardi2009, a skok ekstynkcji $Delta A_0 (d)$ między $cal(M)_"on"$ a $cal(M)_"off"$ weryfikowany jest kryterium $Delta "BIC" >= 10$, zakresem optycznym $(N_("fg,on"), N_("bg,on") >= 5)$ oraz katalogami mazerów VLBI i kostek CO PPV @zucker2019 @zucker2020 @yan2019 @yan2021 @reid2019 @dame2001 @edenhofer2024.

4. *Extreme Deconvolution (XD) oraz ważona wariancją regresja $k$-NN z jawną odmową (`estimators.py`, `evaluate.py`)* — do wyznaczania $y = log_10 (d)$ z 15 grup cech i propagowanych macierzy kowariancji błędów pomiarowych $bold(S)_i$ zaimplementowano dwa komplementarne estymatory: (a) pełnokowariancyjny model mieszaniny Gaussa *Extreme Deconvolution (XD)* uczony algorytmem EM ($bold(T)_(i k) = bold(R)_i bold(V)_k bold(R)_i^top + bold(S)_i$), który analitycznie marginalizuje brakujące pasma i dekonwolwuje szum pomiarowy @bovy2011, oraz (b) podprzestrzenny regresor $k$-NN po wspólnie obserwowanych cechach $O_(i j)$ z jawną bramką odmowy (*Risk–Coverage / AURC*) @dixon1979 @nadaraya1964 @watson1964 @dudani1976 @chow1970 @geifman2017:
   $ bold(T)_(i k) = bold(R)_i bold(V)_k bold(R)_i^top + bold(S)_i, quad D_(i j)^2 = (sum_(c in O_(i j)) tilde(w)_c^2 (1 + sigma_(i c)^2 + sigma_(j c)^2)^(-1) (hat(x)_(i c) - hat(x)_(j c))^2) / (sum_(c in O_(i j)) tilde(w)_c^2 (1 + sigma_(i c)^2 + sigma_(j c)^2)^(-1)), quad hat(y)_i = sum_(j in cal(N)_k (i)) alpha_(i j) y_j. $

5. *Utrata informacji Shannona i przybliżenie Gaussa dywergencji Kullbacka–Leiblera (`estimators.py`, `evaluate.py`)* — odcinanie kolejnych katalogów (od najrzadszych do samych współrzędnych $alpha, delta$) mierzy przyrost entropii reszt $Delta I_s$ oraz zysk informacyjny $D_"KL" (P_"post" parallel P_"prior")$ w bitach (wraz ze znakiem zmian $Delta D_"KL"$ wzdłuż trajektorii odcinania) @shannon1948 @cover2006:
   $ Delta I_s = 1 / 2 log_2 ("RMSE"_s^2 / "RMSE"_0^2) " [bity]", quad D_"KL" (P_"post" parallel P_"prior") = 1 / (ln 2) (ln (sigma_"prior" / hat(sigma)_i) + (hat(sigma)_i^2 + (hat(y)_i - mu_"prior")^2) / (2 sigma_"prior"^2) - 1 / 2). $

== 2. Zgodność ze standardami publikacji astronomicznych (podsumowanie weryfikacji)

- *Galaktyki ($z -> d$ i Cosmicflows-4):* Dla bliskich galaktyk ($z lt.tilde 0.05$) transformacja $z_"helio" -> z_"CMB"$ łączona jest z bezpośrednimi pomiarami modułu odległości z *Cosmicflows-4* (`J/ApJ/944/94/table2`, np. M87 $"DM" = 31.134 "mag"$, NGC 4889 $"DM" = 35.126 "mag"$) @tully2023 oraz kontrolą niejednoznaczności dopasowania kątowego.
- *Gwiazdy (paralaksy, `gaiadr3-zeropoint` i StarHorse):* Stosowana jest oficjalna tablica kalibracyjna Lindegrena (`gaiadr3-zeropoint`, z zachowaniem surowych paralaks poza dziedziną $6 < G < 21$) @lindegren2021, filtr $"RUWE" < 1.4$ oraz rzeczywiste odległości spektrofotometryczne *StarHorse* (`I/354/starhorse2021`) @anders2022 i *GSP-Phot* @creevey2023.
- *Gromady otwarte i mgławice (IC 434 / $sigma$ Ori):* Członkostwo w 5D $(alpha, delta, mu_alpha^*, mu_delta, ϖ_"corr")$ wyznaczane jest zarówno przez `HDBSCAN` @hunt2023 ($397.2 "pc"$), jak i pełny astrometryczny *UPMASK* @kronemartins2014 @cantatgaudin2018 ($402.4 "pc"$) z odrzucaniem jednorodnego szumu pola, a odległość obłoków kontrolowana jest przez tomografię ekstynkcji 3D i maski CO PPV @zucker2019 @zucker2020.
- *Niekompletne katalogi i szum pomiarowy (XD vs $k$-NN):* Pełnokowariancyjne *Extreme Deconvolution (XD)* @bovy2011 na 48 cechach z propagowanymi błędami pomiarowymi osiąga $"MAE" = 0.0749 "dex"$ ($9.22%$ błędu względnego) przy monotonicznie rosnącej wiarygodności EM, przewyższając podprzestrzenny $k$-NN ($"MAE" = 0.1189 "dex"$).

#pagebreak()

= English Version (EN)

== 1. Methods & Equations Implemented in the Repository

1. *Flat $Lambda$CDM Cosmology & Cosmicflows-4 Distance Moduli (Extragalactic Targets, `catalogs.py`, `estimators.py`, `distance.py`)* — for galaxies/QSOs, the pipeline integrates direct distance moduli $"DM"$ from *Cosmicflows-4* (`J/ApJ/944/94/table2`, $d_"Mpc" = 10^(("DM" - 25)\/5)$) @tully2023 alongside SDSS DR17 spectroscopic redshifts $z > 0.0005$ @abdurrouf2022sdss (transformed $z_"helio" -> z_"CMB"$ against the Planck dipole for $z < 0.05$) under *Planck 2018* parameters ($H_0 = 67.66 "km s"^(-1) "Mpc"^(-1)$, $Omega_(m,0) = 0.30966$) @planck2020 @hogg1999:
   $ d_C (z) = c / H_0 integral_0^z (dif z') / sqrt(Omega_(m,0) (1 + z')^3 + Omega_(Lambda,0)), quad d_L (z) = (1 + z) d_C (z), quad d_A (z) = d_C (z) / (1 + z). $

2. *Bayesian Photogeometric Inversion, StarHorse & Published Zero-Point Calibration (Resolved Stars, `catalogs.py`, `distance.py`)* — naive inversion $d = 1 / ϖ$ suffers from Lutz–Kelker bias when $sigma_ϖ / ϖ gt.tilde 0.2$ @luri2018. After filtering astrometric binaries ($"RUWE" < 1.4$) and subtracting the published Lindegren 5p/6p parallax zero-point (`gaiadr3-zeropoint`) $ϖ_"corr" = ϖ - Z_(5\/6)(G, nu_"eff", hat(nu), beta)$ @lindegren2021, the pipeline synthesizes Bailer-Jones photogeometric posteriors @bailerjones2021 @gaia2023dr3, *StarHorse* Bayesian spectrophotometric distances (`I/354/starhorse2021`) @anders2022, and *GSP-Phot* isochrones @creevey2023:
   $ P(r mid(|) ϖ, sigma_ϖ, G, G_"BP" - G_"RP", l, b) prop P(ϖ mid(|) r, sigma_ϖ) P(G mid(|) r, G_"BP" - G_"RP", l, b) P(r mid(|) l, b). $

3. *5D HDBSCAN / UPMASK Clustering, Hierarchical Parallax, NICER NIR & 3D Dust Breakpoint (Nebulae, Clusters & LDN Globules, `estimators.py`)* — for extended targets, the 1D log-distance KDE mode ($h = 0.12 "dex"$) @scott2015 seeds 5D phase-space member selection in $(alpha, delta, mu_alpha^*, mu_delta, ϖ_"corr")$ via `HDBSCAN` @hunt2023, astrometric *UPMASK* (PCA + $k$-means + 2D KDE spatial randomness test against 200 uniform null fields + Monte Carlo draws from full astrometric error covariance) @kronemartins2014 @cantatgaudin2018, or MAD filtering, and the systemic distance $theta_d$ maximizes $product_i cal(N)(ϖ_("corr", i) mid(|) 1000 / theta_d, sigma_(ϖ, i)^2 + sigma_"int"^2)$. For Lynds Dark Nebulae (`LDN`) @lynds1962 and Bok globules, dust-censored stars are rescued via 2MASS/WISE *NICER/NICEST* color excess @lombardi2001 @lombardi2009, and the on/off-cloud differential jump $Delta A_0 (d)$ is gated by $Delta "BIC" >= 10$, optical range $(N_("fg,on"), N_("bg,on") >= 5)$, and CO PPV / VLBI maser catalogs @zucker2019 @zucker2020 @yan2019 @yan2021 @reid2019 @dame2001 @edenhofer2024.

4. *Extreme Deconvolution (XD) & Variance-Weighted Missingness-Tolerant $k$-NN with Selective Abstention (`estimators.py`, `evaluate.py`)* — to predict $y = log_10 (d)$ across 15 feature groups with propagated measurement error covariance matrices $bold(S)_i$, the repository implements both: (a) a full-covariance *Extreme Deconvolution (XD)* EM Gaussian Mixture regressor ($bold(T)_(i k) = bold(R)_i bold(V)_k bold(R)_i^top + bold(S)_i$) that analytically projects observed subspaces and deconvolves heteroscedastic noise @bovy2011, and (b) a partial-subspace $k$-NN regressor over mutually observed features $O_(i j)$ with explicit selective abstention (*Risk–Coverage / AURC*) @dixon1979 @nadaraya1964 @watson1964 @dudani1976 @chow1970 @geifman2017:
   $ bold(T)_(i k) = bold(R)_i bold(V)_k bold(R)_i^top + bold(S)_i, quad D_(i j)^2 = (sum_(c in O_(i j)) tilde(w)_c^2 (1 + sigma_(i c)^2 + sigma_(j c)^2)^(-1) (hat(x)_(i c) - hat(x)_(j c))^2) / (sum_(c in O_(i j)) tilde(w)_c^2 (1 + sigma_(i c)^2 + sigma_(j c)^2)^(-1)), quad hat(y)_i = sum_(j in cal(N)_k (i)) alpha_(i j) y_j. $

5. *Shannon Information Loss & Gaussian-Approximation Bayesian KL Information Gain (`estimators.py`, `evaluate.py`)* — sequentially pruning catalog groups down to bare coordinates $(alpha, delta)$ quantifies empirical entropy loss $Delta I_s$ and per-star Kullback–Leibler information gain $D_"KL" (P_"post" parallel P_"prior")$ in bits (along with signed pruning step changes $Delta D_"KL"$) @shannon1948 @cover2006:
   $ Delta I_s = 1 / 2 log_2 ("RMSE"_s^2 / "RMSE"_0^2) " [bits]", quad D_"KL" (P_"post" parallel P_"prior") = 1 / (ln 2) (ln (sigma_"prior" / hat(sigma)_i) + (hat(sigma)_i^2 + (hat(y)_i - mu_"prior")^2) / (2 sigma_"prior"^2) - 1 / 2). $

== 2. Alignment with Astronomy Literature Standards (Verification Summary)

- *Extragalactic Distances ($z -> d$ & Cosmicflows-4):* Low-redshift ($z lt.tilde 0.05$) $z_"helio" -> z_"CMB"$ dipole transformations are paired with direct *Cosmicflows-4* distance moduli (`J/ApJ/944/94/table2`, e.g. M87 $"DM" = 31.134 "mag"$, NGC 4889 $"DM" = 35.126 "mag"$) @tully2023 and angular-matching ambiguity rejection.
- *Stellar Parallaxes (`gaiadr3-zeropoint`) & StarHorse:* Uses the official Lindegren 5p/6p interpolation package (`gaiadr3-zeropoint`, preserving labeled raw parallaxes outside $6 < G < 21$) @lindegren2021, $"RUWE" < 1.4$ binary filtering, and cross-matched *StarHorse* (`I/354/starhorse2021`) @anders2022 and *GSP-Phot* @creevey2023 distances.
- *Open Clusters, Associations & Nebulae (IC 434 / $sigma$ Ori):* 5D phase-space membership in $(alpha, delta, mu_alpha^*, mu_delta, ϖ_"corr")$ is verified with both `HDBSCAN` @hunt2023 ($397.2 "pc"$) and astrometric *UPMASK* @kronemartins2014 @cantatgaudin2018 ($402.4 "pc"$) with uniform-noise abstention, while molecular cloud distances are gated by 3D dust tomography and CO PPV masks @zucker2019 @zucker2020.
- *Missing Multi-Survey Bands & Heteroscedastic Errors (XD vs $k$-NN):* Full-covariance *Extreme Deconvolution (XD)* @bovy2011 across 48 features with propagated measurement errors achieves $"MAE" = 0.0749 "dex"$ ($9.22%$ median relative error) with monotonically non-decreasing EM log-likelihood, outperforming partial-subspace $k$-NN ($"MAE" = 0.1189 "dex"$).

#v(0.4em)
#line(length: 100%, stroke: 0.4pt + luma(190))
#v(0.2em)

#set text(size: 7.8pt)
#bibliography("references.bib", title: "Bibliografia / References", style: "ieee")
