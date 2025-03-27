# Cartogame Builder

## Builder for the navigation mobile game.

Generate a game by setting a player start position and a target position. You are then free
to add and remove pitfalls and bonuses between the two.
Hints are used during the first phase of the game where you need to find the player start from
the global map of France at zoom level 5.

Some tips to generate a game:
- Your **first hint must start a zoom level 5** (the zoom level where the game will start)
- Add hints when the **basemap changes** (new toponyms appear, relief becomes visible, etc.)
- Pitfalls and bonuses have an **area of influence** only visible at a certain zoom level, keep that in mind when placing them.

<p align="center">
  <img src="https://raw.githubusercontent.com/LostInZoom/cartogame-builder/refs/heads/main/readme-description.png" alt="Readme description"/>
</p>

Here is an example of a generated game using this tool.

```json
{
  "start": {
    "zoom": 5,
    "center": [
      270845.15,
      5904541.3
    ]
  },
  "player": [
    493046.74493505404,
    5380807.32585328
  ],
  "target": [
    514653.0400344121,
    5414792.47729121
  ],
  "hints": {
    "5": "You are around Marseille, in the south of France",
    "6": "You are between Marseille and Montpellier, south of Nîmes",
    "9": "You are south of the Parc Naturel Régional (PNR) de Camargue",
    "10": "You are in Stes-Maries-de-la-Mer",
    "14": "You are south of Brise de Mer"
  },
  "pitfalls": [
    [
      491663.2782263552,
      5383447.123973138
    ],
    [
      494446.1188716347,
      5386954.187330368
    ],
    [
      489284.06142855424,
      5383318.603223704
    ],
    [
      490029.7859094538,
      5391845.607476419
    ],
    [
      509981.1576403265,
      5379676.468770959
    ],
    [
      513536.437312617,
      5386061.987399762
    ],
    [
      517066.5396887316,
      5391808.791532555
    ],
    [
      516798.95935453346,
      5394132.875137133
    ],
    [
      518494.3350723188,
      5381824.08132211
    ],
    [
      526466.8079754136,
      5375113.916628674
    ],
    [
      508818.68018990266,
      5406220.042560888
    ],
    [
      513229.5369103572,
      5405162.37923134
    ],
    [
      498447.0071327558,
      5405221.823111923
    ],
    [
      514962.5193100919,
      5399787.099159831
    ],
    [
      517901.8872114213,
      5401142.647859231
    ],
    [
      489863.4209196182,
      5395726.965108126
    ],
    [
      510619.24981843814,
      5413524.788799325
    ]
  ],
  "bonus": [
    [
      491742.63026732934,
      5383407.988415571
    ],
    [
      487490.70420239435,
      5388740.514474915
    ],
    [
      492870.21287018486,
      5388552.5840411065
    ],
    [
      489907.9832152113,
      5393737.186307658
    ],
    [
      492147.01916885487,
      5399577.051286186
    ],
    [
      499041.22705795645,
      5395143.087158937
    ],
    [
      496233.8251097842,
      5391661.461171858
    ],
    [
      501319.6221122256,
      5382469.064933732
    ],
    [
      508042.03177782544,
      5381542.557204218
    ],
    [
      513715.6173683892,
      5379193.825881556
    ],
    [
      513498.9341067159,
      5375485.705642696
    ],
    [
      517035.89745407045,
      5386202.716475587
    ],
    [
      523870.6155029345,
      5384022.979155901
    ],
    [
      521072.6163310416,
      5378880.192488667
    ],
    [
      520244.36927001143,
      5369253.025936681
    ],
    [
      519712.59237674926,
      5390553.600804552
    ],
    [
      516077.7920838158,
      5389334.114492581
    ],
    [
      516258.00889224967,
      5400873.942006668
    ],
    [
      512577.09475491795,
      5399122.970120535
    ],
    [
      510240.6449235043,
      5408148.298607647
    ],
    [
      510109.07257469196,
      5411507.725052051
    ],
    [
      504275.3575913119,
      5407915.636362968
    ],
    [
      501308.1175419298,
      5400750.067007925
    ]
  ]
}
```