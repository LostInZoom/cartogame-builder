import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { MapLayers } from './layers.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import { Feature } from 'ol';
import Collection from 'ol/Collection.js';
import { Point, LineString } from 'ol/geom.js';

import { addClass, addSVG, hasClass, makeDiv, removeClass } from "../utils/dom.js";
import { Basemap } from "./map.js";
import { distance } from './analysis.js';

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

        this.validatemask = makeDiv(null, 'builder-mask');

        this.validatecontainer = makeDiv(null, 'builder-validate collapse');
        this.validatetext = makeDiv(null, 'builder-validate-text', 'This will reset the current game.<br>Proceed?');
        this.validatebuttons = makeDiv(null, 'builder-validate-buttons');
        this.validaterefuse = makeDiv(null, 'builder-validate-button', 'No');
        this.validateaccept = makeDiv(null, 'builder-validate-button', 'Yes');
        this.validatebuttons.append(this.validaterefuse, this.validateaccept);
        this.validatecontainer.append(this.validatetext, this.validatebuttons);
        this.page.container.append(this.validatemask, this.validatecontainer);

        this.validateaccept.addEventListener('click', () => {
            this.clear();
            removeClass(this.validatemask, 'active');
            addClass(this.validatecontainer, 'collapse');
        });

        this.validaterefuse.addEventListener('click', () => {
            removeClass(this.validatemask, 'active');
            addClass(this.validatecontainer, 'collapse');
        });

        this.buttonclear = makeDiv(null, 'builder-clear builder-button-round');
        addSVG(this.buttonclear, new URL('../img/clear.svg', import.meta.url));
        this.page.container.append(this.buttonclear);

        this.buttondelete = makeDiv(null, 'builder-delete builder-button-round');
        addSVG(this.buttondelete, new URL('../img/trash.svg', import.meta.url));
        this.page.container.append(this.buttondelete);

        this.buttonclear.addEventListener('click', (e) => {
            if (this.containsElements()) {
                addClass(this.validatemask, 'active');
                removeClass(this.validatecontainer, 'collapse');
            }
        });

        this.buttondelete.addEventListener('click', (e) => {
            if (hasClass(this.buttondelete, 'active')) {
                removeClass(this.buttondelete, 'active');
                this.delete = false;
            } else {
                addClass(this.buttondelete, 'active');
                this.delete = true;
            }
        });

        this.buttontry = makeDiv(null, 'builder-try builder-button-round collapse', 'Play');
        addSVG(this.buttontry, new URL('../img/play.svg', import.meta.url));
        this.page.container.append(this.buttontry);

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
                this.handleTry();
            }
            else if (this.mode === 'target') {
                if (this.delete) {
                    this.basemap.layers.setGeometry('target', null);
                    this.target = undefined;
                } else {
                    this.basemap.setTarget(coordinates);
                    this.target = coordinates;
                }
                this.handleTry();
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

        if (feature !== undefined) {
            s.removeFeature(feature);
            this[layer].splice(index, 1);
        }
        if (featureArea !== undefined) {
            sa.removeFeature(featureArea);
        }
    }

    clear() {
        this.basemap.layers.setGeometry('player', null);
        this.player = undefined;
        this.basemap.layers.setGeometry('target', null);
        this.target = undefined;

        let b = this.basemap.layers.getLayer('bonus').getSource();
        let ba = this.basemap.layers.getLayer('bonusArea').getSource();
        b.getFeatures().forEach((element) => {
            b.removeFeature(element);

        })
        ba.getFeatures().forEach((element) => {
            ba.removeFeature(element);
        })
        let p = this.basemap.layers.getLayer('pitfalls').getSource();
        let pa = this.basemap.layers.getLayer('pitfallsArea').getSource();
        p.getFeatures().forEach((element) => {
            p.removeFeature(element);
        })
        pa.getFeatures().forEach((element) => {
            pa.removeFeature(element);
        })
        this.bonus = [];
        this.pitfalls = [];
    }

    handleTry() {
        if (hasClass(this.buttontry, 'collapse')) {
            if (this.player !== undefined && this.target !== undefined) {
                removeClass(this.buttontry, 'collapse');
            }
        } else {
            if (this.player === undefined || this.target === undefined) {
                addClass(this.buttontry, 'collapse');
            }
        }
    }

    containsElements() {
        if (this.player !== undefined) { return true; }
        if (this.target !== undefined) { return true; }
        if (this.pitfalls.length > 0) { return true; }
        if (this.bonus.length > 0) { return true; }
        return false;
    }
}

export { Builder }