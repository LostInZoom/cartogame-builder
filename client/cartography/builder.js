import { addClass, addSVG, downloadJSON, hasClass, makeDiv, removeClass, wait } from "../utils/dom.js";
import { Basemap } from "./map.js";
import { distance } from './analysis.js';
import { isJSON } from "../utils/parse.js";

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
        this.hints = {};
    }

    initialize(game, callback) {
        callback = callback || function () {};
        let zoom = this.app.params.builder.start.zoom;

        this.basemap = new Basemap(this.page);
        this.basemap.type = 'builder';
        this.basemap.interactable = true;
        this.basemap.initialize();

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

        this.basemap.setCenter(this.app.params.builder.start.center);
        this.basemap.setZoom(this.app.params.builder.start.zoom);

        this.dragindicator = makeDiv(null, 'builder-drag-indicator', 'Drop a valid JSON file to load a game');
        this.page.container.append(this.dragindicator);

        let self = this;
        this.page.container.addEventListener('dragenter', (e) => {
            e.stopPropagation();
            e.preventDefault();
            addClass(this.dragindicator, 'active');
        })
        this.page.container.addEventListener('dragleave', (e) => {
            removeClass(this.dragindicator, 'active');
        })
        this.page.container.addEventListener('dragover', (e) => {
            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        })

        this.page.container.addEventListener('drop', (e) => {
            e.stopPropagation();
            e.preventDefault();
            let files = e.dataTransfer.files
            let reader = new FileReader();
            reader.onloadend = function(f) {
                if (!isJSON(this.result)) { self.popup('This file is not a valid JSON file.') }
                else {
                    let result = JSON.parse(this.result);
                    if (('player' in result === false) || ('target' in result === false)) {
                        self.popup('The provided game must contains a player start and a target.')
                    } else {
                        if (self.containsElements()) {
                            self.validation('This will clear the current game and load the new data.<br>Proceed?', (erase) => {
                                if (erase) {
                                    self.clear();
                                    self.loadGame(result);
                                }
                            })
                        } else {
                            self.loadGame(result);
                        }
                    }
                }
            };

            if (files[0] !== undefined) {
                reader.readAsText(files[0]);
            }

            removeClass(this.dragindicator, 'active');
        })

        this.zoomindicator = makeDiv(null, 'builder-zoom', 'Zoom: ' + zoom.toFixed(2));
        this.page.container.append(this.zoomindicator);

        this.basemap.map.on('postrender', (e) => {
            this.zoomindicator.innerHTML = 'Zoom: ' + this.basemap.view.getZoom().toFixed(2);
        });

        this.buttonclear = makeDiv(null, 'builder-clear builder-button-round');
        addSVG(this.buttonclear, new URL('../img/clear.svg', import.meta.url));
        this.page.container.append(this.buttonclear);

        this.buttondelete = makeDiv(null, 'builder-delete builder-button-round');
        addSVG(this.buttondelete, new URL('../img/trash.svg', import.meta.url));
        this.page.container.append(this.buttondelete);

        this.buttonclear.addEventListener('click', (e) => {
            if (this.containsElements()) {
                this.validation('This will clear the current game.<br>Proceed?', (erase) => {
                    if (erase) {
                        this.clear();
                        this.handleTry();
                    }
                })
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

        this.buttontry = makeDiv(null, 'builder-try builder-button-round collapse');
        addSVG(this.buttontry, new URL('../img/play.svg', import.meta.url));
        this.page.container.append(this.buttontry);

        this.buttontry.addEventListener('click', () => {
            let game = {
                start: {
                    zoom: 5,
                    center: [ 270845.15, 5904541.30 ]
                },
                player: this.player,
                target: this.target,
                hints: this.hints,
                pitfalls: this.pitfalls,
                bonus: this.bonus
            }
            callback(game);
        });

        this.buttondownload = makeDiv(null, 'builder-download builder-button-round collapse');
        addSVG(this.buttondownload, new URL('../img/download.svg', import.meta.url));
        this.page.container.append(this.buttondownload);

        this.buttondownload.addEventListener('click', () => {
            let game = {
                start: {
                    zoom: 5,
                    center: [ 270845.15, 5904541.30 ]
                },
                player: this.player,
                target: this.target,
                hints: this.hints,
                pitfalls: this.pitfalls,
                bonus: this.bonus
            }
            downloadJSON(game, 'game');
        });

        this.hintcontainer = makeDiv(null, 'builder-hint-container');
        this.hintselements = makeDiv(null, 'builder-hints')
        this.buttonhint = makeDiv(null, 'builder-hint-add');
        addSVG(this.buttonhint, new URL('../img/hint.svg', import.meta.url));

        this.hintcontainer.append(this.buttonhint, this.hintselements);
        this.page.container.append(this.hintcontainer);

        this.buttonhint.addEventListener('click', () => { this.createHint(); });

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

        if (game !== null) {
            this.loadGame(game);
        }

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

    loadGame(game) {
        this.basemap.setPlayer(game.player);
        this.player = game.player;
        this.basemap.setTarget(game.target);
        this.target = game.target;

        game.pitfalls.forEach((v) => { this.addPitfall(v); })
        game.bonus.forEach((v) => { this.addBonus(v); })

        for (let [zoom, hint] of Object.entries(game.hints)) {
            this.loadHint(zoom, hint);
        }
        
        this.handleTry();
        this.basemap.fit(50, 500);
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

        Array.from(this.hintselements.children).forEach((element) => {
            addClass(element, 'collapse');
            wait(100, () => { element.remove(); })
        })

        this.bonus = [];
        this.pitfalls = [];
        this.hints = {}
    }

    handleTry() {
        if (hasClass(this.buttontry, 'collapse')) {
            if (this.player !== undefined && this.target !== undefined) {
                removeClass(this.buttontry, 'collapse');
                removeClass(this.buttondownload, 'collapse');
            }
        } else {
            if (this.player === undefined || this.target === undefined) {
                addClass(this.buttontry, 'collapse');
                addClass(this.buttondownload, 'collapse');
            }
        }
    }

    containsElements() {
        if (this.player !== undefined) { return true; }
        if (this.target !== undefined) { return true; }
        if (this.pitfalls.length > 0) { return true; }
        if (this.bonus.length > 0) { return true; }
        let empty = true;
        for (const k in this.hints) { empty = false }
        if (!empty) {
            if (this.hints.keys().length > 0) { return true; }
        }
        return false;
    }

    modifyHint(zoom, container) {
        let text = this.hints[zoom];
        let mask = makeDiv(null, 'builder-mask active');
        let modifycontainer = makeDiv(null, 'builder-modify-container collapse');
        let modifylabel = makeDiv(null, 'builder-modify-label', `
                Hint to be displayed after zoom ${zoom}:
            `)
        let input = makeDiv(null, 'builder-modify-input', text);
        input.setAttribute('contenteditable', true);
        let buttons = makeDiv(null, 'builder-modify-buttons');
        let validate = makeDiv(null, 'builder-modify-button', 'Validate');
        let cancel = makeDiv(null, 'builder-modify-button', 'Cancel');
        let remove = makeDiv(null, 'builder-modify-button', 'Delete');
        buttons.append(cancel, validate, remove);
        modifycontainer.append(modifylabel, input, buttons);

        this.page.container.append(mask, modifycontainer);

        wait(20, () => {
            removeClass(modifycontainer, 'collapse');
            input.selectionStart = input.selectionEnd = input.innerHTML.length - 1;
            input.focus();

            cancel.addEventListener('click', () => {
                addClass(modifycontainer, 'collapse');
                mask.remove();
            });
            validate.addEventListener('click', () => {
                let str = input.innerHTML;
                this.hints[zoom] = str.replace(/\s+$/, '').replace('<br>', '');
                addClass(modifycontainer, 'collapse');
                mask.remove();
            });
            remove.addEventListener('click', () => {
                delete this.hints[zoom];
                addClass(modifycontainer, 'collapse');
                addClass(container, 'collapse');
                mask.remove();
                wait(100, () => {
                    container.remove();
                });
            });
        });
    }

    createHint() {
        let zoom = Math.round(this.basemap.view.getZoom());
        let already = false;
        for (let key in this.hints) { if (parseInt(key) === parseInt(zoom)) { already = true; break; } }
        if (!already) {
            let hint = makeDiv(null, 'builder-hint-level collapse', zoom);
            hint.setAttribute('value', zoom);
            let before;
            for (let i = 0; i < this.hintselements.children.length; ++i) {
                if (parseInt(this.hintselements.children[i].getAttribute('value')) < zoom) {
                    before = this.hintselements.children[i];
                    break;
                }
            }
            if (before !== undefined) { this.hintselements.insertBefore(hint, before); }
            else { this.hintselements.append(hint); }
            wait(10, () => { removeClass(hint, 'collapse'); });
            this.hints[zoom] = '';

            hint.addEventListener('click', () => {
                this.modifyHint(zoom, hint);
            });

            this.modifyHint(zoom, hint);
        }  
    }

    loadHint(zoom, hint) {
        let h = makeDiv(null, 'builder-hint-level collapse', zoom);
        h.setAttribute('value', zoom);
        let before;
        for (let i = 0; i < this.hintselements.children.length; ++i) {
            if (parseInt(this.hintselements.children[i].getAttribute('value')) < zoom) {
                before = this.hintselements.children[i];
                break;
            }
        }
        if (before !== undefined) { this.hintselements.insertBefore(h, before); }
        else { this.hintselements.append(h); }
        wait(10, () => { removeClass(h, 'collapse'); });

        this.hints[zoom] = hint;

        h.addEventListener('click', () => {
            this.modifyHint(zoom, h);
        });
    }

    popup(text, callback) {
        callback = callback || function () {};
        let validatemask = makeDiv(null, 'builder-mask');
        let validatecontainer = makeDiv(null, 'builder-validate collapse');
        let validatetext = makeDiv(null, 'builder-validate-text', text);
        let validatebuttons = makeDiv(null, 'builder-validate-buttons');
        let validateaccept = makeDiv(null, 'builder-validate-button', 'OK');
        validatebuttons.append(validateaccept);
        validatecontainer.append(validatetext, validatebuttons);
        this.page.container.append(validatemask, validatecontainer);
        wait(20, () => { removeClass(validatecontainer, 'collapse'); })
        validateaccept.addEventListener('click', () => {
            removeClass(validatemask, 'active');
            addClass(validatecontainer, 'collapse');
            wait(100, () => {
                validatemask.remove();
                validatecontainer.remove();
                callback();
            })            
        });
    }

    validation(text, callback) {
        callback = callback || function () {};
        let validatemask = makeDiv(null, 'builder-mask');
        let validatecontainer = makeDiv(null, 'builder-validate collapse');
        let validatetext = makeDiv(null, 'builder-validate-text', text);
        let validatebuttons = makeDiv(null, 'builder-validate-buttons');
        let validaterefuse = makeDiv(null, 'builder-validate-button', 'No');
        let validateaccept = makeDiv(null, 'builder-validate-button', 'Yes');
        validatebuttons.append(validaterefuse, validateaccept);
        validatecontainer.append(validatetext, validatebuttons);
        this.page.container.append(validatemask, validatecontainer);

        wait(20, () => { removeClass(validatecontainer, 'collapse'); })

        validateaccept.addEventListener('click', () => {
            removeClass(validatemask, 'active');
            addClass(validatecontainer, 'collapse');
            wait(100, () => {
                validatemask.remove();
                validatecontainer.remove();
                callback(true);
            })            
        });

        validaterefuse.addEventListener('click', () => {
            removeClass(validatemask, 'active');
            addClass(validatecontainer, 'collapse');
            wait(100, () => {
                validatemask.remove();
                validatecontainer.remove();
                callback(false);
            })
        });
    }
}

export { Builder }