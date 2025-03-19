import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { MapLayers } from './layers.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';

import { makeDiv } from "../utils/dom.js";
import { Basemap } from "./map.js";

class Builder {
    constructor(app, page) {
        this.app = app;
        this.page = page;

        let zoom = this.app.params.builder.start.zoom;

        this.basemap = new Basemap(this.page);
        this.basemap.type = 'builder';
        this.basemap.interactable = true;
        this.basemap.initialize();
        this.basemap.setCenter(this.app.params.builder.start.center);
        this.basemap.setZoom(this.app.params.builder.start.zoom);

        this.zoomindicator = makeDiv(null, 'builder-zoom', zoom.toFixed(2));
        this.page.container.append(this.zoomindicator);

        this.basemap.map.on('moveend', (e) => {
            this.zoomindicator.innerHTML = this.basemap.view.getZoom().toFixed(2);
        });

        this.buttoncontainer = makeDiv(null, 'builder-buttons');
        this.buttonplayer = makeDiv(null, 'builder-button', 'Player start');
        this.buttontarget = makeDiv(null, 'builder-button', 'Target');
        this.buttonpitfalls = makeDiv(null, 'builder-button', 'Pitfalls');
        this.buttonbonus = makeDiv(null, 'builder-button', 'Bonus');
        this.buttoncontainer.append(this.buttonplayer, this.buttontarget, this.buttonpitfalls, this.buttonbonus);
        this.page.container.append(this.buttoncontainer);
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }
}

export { Builder }