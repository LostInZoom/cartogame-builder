import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { MapLayers } from './layers.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import { Feature } from 'ol';
import Collection from 'ol/Collection.js';
import { Point, LineString } from 'ol/geom.js';

import { addClass, addSVG, hasClass, makeDiv, removeClass } from "../utils/dom.js";
import { Basemap } from "./map.js";
import { within, distance } from './analysis.js';

class Builder {
    constructor(app, page) {
        this.app = app;
        this.page = page;

        this.mode = '';
        this.delete = false;
        this.player;
        this.target;
        this.pitfalls = [];
        this.bonus = [];

        let zoom = this.app.params.builder.start.zoom;

        this.basemap = new Basemap(this.page);
        this.basemap.type = 'builder';
        this.basemap.interactable = true;
        this.basemap.initialize();
        this.basemap.setCenter(this.app.params.builder.start.center);
        this.basemap.setZoom(this.app.params.builder.start.zoom);

        this.basemap.layers.add('player', 50);
        this.basemap.layers.add('target', 51);

        this.basemap.layers.add('pitfalls', 49);
        this.basemap.layers.setMaxZoom('pitfalls', 12);

        this.basemap.layers.add('pitfallsArea', 48);
        this.basemap.layers.setMinZoom('pitfallsArea', 12);

        this.basemap.layers.add('bonus', 47);
        this.basemap.layers.setMaxZoom('bonus', 12);

        this.basemap.layers.add('bonusArea', 46);
        this.basemap.layers.setMinZoom('bonusArea', 12);

        this.basemap.map.addLayer(this.basemap.layers.getLayer('player'));
        this.basemap.map.addLayer(this.basemap.layers.getLayer('target'));
        this.basemap.map.addLayer(this.basemap.layers.getLayer('pitfalls'));
        this.basemap.map.addLayer(this.basemap.layers.getLayer('pitfallsArea'));
        this.basemap.map.addLayer(this.basemap.layers.getLayer('bonus'));
        this.basemap.map.addLayer(this.basemap.layers.getLayer('bonusArea'));

        this.zoomindicator = makeDiv(null, 'builder-zoom', 'Zoom: ' + zoom.toFixed(2));
        this.page.container.append(this.zoomindicator);

        this.basemap.map.on('moveend', (e) => {
            this.zoomindicator.innerHTML = 'Zoom: ' + this.basemap.view.getZoom().toFixed(2);
        });

        this.buttondelete = makeDiv(null, 'builder-delete');
        addSVG(this.buttondelete, new URL('../img/trash.svg', import.meta.url));
        this.page.container.append(this.buttondelete);

        this.buttondelete.addEventListener('click', (e) => {
            if (hasClass(this.buttondelete, 'active')) {
                removeClass(this.buttondelete, 'active');
                this.delete = false;
            } else {
                addClass(this.buttondelete, 'active');
                this.delete = true;
            }
        });

        this.buttoncontainer = makeDiv(null, 'builder-buttons');
        this.buttonplayer = makeDiv('builder-player', 'builder-button', 'Player start');
        this.buttonplayer.setAttribute('value', 'player');
        this.buttontarget = makeDiv('builder-target', 'builder-button', 'Target');
        this.buttontarget.setAttribute('value', 'target');
        this.buttonpitfalls = makeDiv('builder-pitfalls', 'builder-button', 'Pitfalls');
        this.buttonpitfalls.setAttribute('value', 'pitfalls');
        this.buttonbonus = makeDiv('builder-bonus', 'builder-button', 'Bonus');
        this.buttonbonus.setAttribute('value', 'bonus');
        this.buttoncontainer.append(this.buttonplayer, this.buttontarget, this.buttonpitfalls, this.buttonbonus);
        this.page.container.append(this.buttoncontainer);

        this.buttonplayer.addEventListener('click', this.switchMode.bind(this));
        this.buttontarget.addEventListener('click', this.switchMode.bind(this));
        this.buttonpitfalls.addEventListener('click', this.switchMode.bind(this));
        this.buttonbonus.addEventListener('click', this.switchMode.bind(this));

        this.basemap.map.on('click', (e) => {
            let coordinates = this.basemap.map.getEventCoordinate(event);
            if (this.mode === 'player') {
                if (this.delete) {
                    this.basemap.layers.setGeometry('player', null);
                    this.player = undefined;
                } else {
                    this.basemap.setPlayer(coordinates);
                    this.player = coordinates;
                }
                
            }
            else if (this.mode === 'target') {
                if (this.delete) {
                    this.basemap.layers.setGeometry('target', null);
                    this.target = undefined;
                } else {
                    this.basemap.setTarget(coordinates);
                    this.target = coordinates;
                }
            }
            else if (this.mode === 'pitfalls') {
                if (this.delete) {
                    this.removeClosestFeature(coordinates, 'pitfalls', this.app.params.builder.tolerance.delete.pitfalls);
                } else {
                    this.addPitfall(coordinates);
                }
            }
            else if (this.mode === 'bonus') {
                if (this.delete) {
                    this.removeClosestFeature(coordinates, 'bonus', this.app.params.builder.tolerance.delete.bonus);
                } else {
                    this.addBonus(coordinates);
                }
            }
        });
    }

    switchMode(e) {
        let buttons = [ this.buttonplayer, this.buttontarget, this.buttonpitfalls, this.buttonbonus ];
        let mode = '';
        for (let i = 0; i < buttons.length; i++) {
            if (e.target === buttons[i]) {
                if (hasClass(e.target, 'active')) { removeClass(e.target, 'active'); }
                else {
                    addClass(e.target, 'active');
                    mode = e.target.getAttribute('value');
                }
            } else {
                removeClass(buttons[i], 'active');
            }
        }
        this.mode = mode;
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }

    addPitfall(coordinates) {
        this.pitfalls.push(coordinates);
        this.basemap.addZone('pitfallsArea', coordinates, this.app.params.game.tolerance.pitfalls);
        this.basemap.addPoint('pitfalls', coordinates);
    }

    addBonus(coordinates) {
        this.bonus.push(coordinates);
        this.basemap.addZone('bonusArea', coordinates, this.app.params.game.tolerance.bonus);
        this.basemap.addPoint('bonus', coordinates);
    }

    removeClosestFeature(coordinates, layer, tolerance) {
        let s = this.basemap.layers.getLayer(layer).getSource();
        let sa = this.basemap.layers.getLayer(layer + 'Area').getSource();
        let index, mindist, feature, featureArea;

        s.getFeatures().forEach((element, i) => {
            let geom = element.getGeometry();
            if(geom !== undefined) {
                let d = distance(coordinates, geom.getCoordinates());
                if (d < tolerance) {
                    if (mindist === undefined) {
                        index = i; mindist = d; feature = element;
                    } else {
                        if (d < mindist) { index = i; mindist = d; feature = element; }
                    }
                }
            }
        })

        sa.getFeatures().forEach((element, i) => {
            let geom = element.getGeometry();
            if(geom !== undefined) {
                if (i == index) {
                    featureArea = element;
                }
            }
        })

        if (feature !== undefined) { s.removeFeature(feature); }
        if (featureArea !== undefined) { sa.removeFeature(featureArea); }
    }
}

export { Builder }