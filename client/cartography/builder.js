import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { MapLayers } from './layers.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';

import { addClass, addSVG, hasClass, makeDiv, removeClass } from "../utils/dom.js";
import { Basemap } from "./map.js";

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
        this.buttonplayer = makeDiv(null, 'builder-button', 'Player start');
        this.buttonplayer.setAttribute('value', 'player');
        this.buttontarget = makeDiv(null, 'builder-button', 'Target');
        this.buttontarget.setAttribute('value', 'target');
        this.buttonpitfalls = makeDiv(null, 'builder-button', 'Pitfalls');
        this.buttonpitfalls.setAttribute('value', 'pitfalls');
        this.buttonbonus = makeDiv(null, 'builder-button', 'Bonus');
        this.buttonbonus.setAttribute('value', 'bonus');
        this.buttoncontainer.append(this.buttonplayer, this.buttontarget, this.buttonpitfalls, this.buttonbonus);
        this.page.container.append(this.buttoncontainer);

        this.buttonplayer.addEventListener('click', this.switchMode.bind(this));
        this.buttontarget.addEventListener('click', this.switchMode.bind(this));
        this.buttonpitfalls.addEventListener('click', this.switchMode.bind(this));
        this.buttonbonus.addEventListener('click', this.switchMode.bind(this));

        this.basemap.map.on('click', (e) => {
            let coordinates = this.basemap.map.getEventCoordinate(event);

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
        console.log(this.mode)
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }

    addPitfall(coordinates) {
        for (let i = 0; i < coordinates.length; i++) {
            this.addZone('pitfallsArea', coordinates[i], this.params.game.tolerance.pitfalls, i);
            this.addPoint('pitfalls', coordinates[i], i);
        }
    }

    addBonus(coordinates) {
        for (let i = 0; i < coordinates.length; i++) {
            this.addZone('bonusArea', coordinates[i], this.params.game.tolerance.bonus, i);
            this.addPoint('bonus', coordinates[i], i);
        }
    }
}

export { Builder }