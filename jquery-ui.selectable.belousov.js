/*! belousov.selectable - v1.0.2 - 2014-05-30
* http://jqueryui.com
* Required: jquery-ui-1.10.4.js
* Copyright 2014 jQuery Foundation, Oleg Belousov and other contributors; Licensed MIT */

(function ($, undefined) {

    $.widget("belousov.selectable", $.ui.mouse, {
        version: "1.0.2",
        options: {
            //appendTo: "body",
            autoRefresh: true,
            distance: 0,
            filter: "*",
            tolerance: "touch",
            singleselect: false,

            // callbacks
            selected: null,
            selecting: null,
            start: null,
            stop: null,
            unselected: null,
            unselecting: null
        },
        _create: function () {
            var selectees,
			that = this;

            this.element.addClass("ui-selectable ui-widget ui-helper-reset");

            this.dragged = false;

            // cache selectee children based on filter
            this.refresh = function () {
                selectees = $(that.options.filter, that.element[0]);
                selectees.addClass("ui-widget ui-state-default ui-selectee");
                selectees.first().addClass("ui-corner-top");
                selectees.last().addClass("ui-corner-bottom");
                selectees.each(function () {
                    var $this = $(this),
					pos = $this.offset();
                    $.data(this, "selectable-item", {
                        element: this,
                        $element: $this,
                        left: pos.left,
                        top: pos.top,
                        right: pos.left + $this.outerWidth(),
                        bottom: pos.top + $this.outerHeight(),
                        startselected: false,
                        selected: $this.hasClass("ui-selected"),
                        selecting: $this.hasClass("ui-selecting"),
                        unselecting: $this.hasClass("ui-unselecting")
                    });
                });
            };
            this.refresh();

            this.selectees = selectees.addClass("ui-selectee");

            this._mouseInit();

            this.helper = $("<div class='ui-selectable-helper'></div>");
        },

        _destroy: function () {
            this.selectees
			.removeClass("ui-widget ui-state-default ui-selectee ui-corner-top ui-corner-bottom ui-selected ui-selecting ui-unselecting ui-state-active ui-state-hover")
			.removeData("selectable-item");
            this.element
			.removeClass("ui-selectable ui-widget ui-helper-reset");
            this._mouseDestroy();
        },

        _mouseStart: function (event) {
            var that = this,
			options = this.options;

            this.opos = [event.pageX, event.pageY];

            if (this.options.disabled) {
                return;
            }

            this.selectees = $(options.filter, this.element[0]);

            this._trigger("start", event);

            $(options.appendTo).append(this.helper);
            // position helper (lasso)
            this.helper.css({
                "left": event.pageX,
                "top": event.pageY,
                "width": 0,
                "height": 0
            });

            if (options.autoRefresh) {
                this.refresh();
            }

            this.selectees.filter(".ui-selected").each(function () {
                var selectee = $.data(this, "selectable-item");
                selectee.startselected = true;
                if ((!event.metaKey && !event.ctrlKey) || options.singleselect) {
                    selectee.$element.removeClass("ui-selected ui-state-active");
                    selectee.selected = false;
                    selectee.$element.addClass("ui-unselecting ui-state-hover");
                    selectee.unselecting = true;
                    // selectable UNSELECTING callback
                    that._trigger("unselecting", event, {
                        unselecting: selectee.element
                    });
                }
            });

            $(event.target).parents().addBack().each(function () {
                var doSelect,
				selectee = $.data(this, "selectable-item");
                if (selectee) {
                    doSelect = ((!event.metaKey && !event.ctrlKey) || !selectee.$element.hasClass("ui-selected")) && !(options.singleselect && selectee.startselected);
                    selectee.$element
					.removeClass(doSelect ? "ui-unselecting ui-state-hover" : "ui-selected ui-state-active")
					.addClass(doSelect ? "ui-selecting ui-state-hover" : "ui-unselecting ui-state-hover");
                    selectee.unselecting = !doSelect;
                    selectee.selecting = doSelect;
                    selectee.selected = doSelect;
                    // selectable (UN)SELECTING callback
                    if (doSelect) {
                        that._trigger("selecting", event, {
                            selecting: selectee.element
                        });
                    } else {
                        that._trigger("unselecting", event, {
                            unselecting: selectee.element
                        });
                    }
                    return false;
                }
            });

        },

        _mouseDrag: function (event) {

            this.dragged = true;

            if (this.options.disabled) {
                return;
            }

            var tmp,
			that = this,
			options = this.options;

            if (options.singleselect) {

                this.selectees = $(options.filter, this.element[0]);

                this.selectees.filter(".ui-selecting").each(function () {
                    var selectee = $.data(this, "selectable-item");
                    selectee.$element.removeClass("ui-selecting");
                    selectee.selecting = false;
                    if (selectee.startselected) {
                        selectee.$element.addClass("ui-unselecting");
                        selectee.unselecting = true;
                    } else {
                        selectee.$element.removeClass("ui-state-hover");
                    }
                    // selectable UNSELECTING callback
                    that._trigger("unselecting", event, {
                        unselecting: selectee.element
                    });
                });

                $(event.target).parents().addBack().each(function () {
                    var doSelect,
				    selectee = $.data(this, "selectable-item");
                    if (selectee) {
                        selectee.$element.removeClass("ui-unselecting");
                        selectee.unselecting = false;
                        selectee.$element.addClass("ui-selecting ui-state-hover");
                        selectee.selecting = true;
                        // selectable SELECTING callback
                        that._trigger("selecting", event, {
                            selecting: selectee.element
                        });
                    }
                });

            } else {

                var x1 = this.opos[0],
			    y1 = this.opos[1],
			    x2 = event.pageX,
			    y2 = event.pageY;

                if (x1 > x2) { tmp = x2; x2 = x1; x1 = tmp; }
                if (y1 > y2) { tmp = y2; y2 = y1; y1 = tmp; }
                this.helper.css({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 });

                this.selectees.each(function () {
                    var selectee = $.data(this, "selectable-item"),
				    hit = false;

                    //prevent helper from being selected if appendTo: selectable
                    if (!selectee || selectee.element === that.element[0]) {
                        return;
                    }

                    if (options.tolerance === "touch") {
                        hit = (!(selectee.left > x2 || selectee.right < x1 || selectee.top > y2 || selectee.bottom < y1));
                    } else if (options.tolerance === "fit") {
                        hit = (selectee.left > x1 && selectee.right < x2 && selectee.top > y1 && selectee.bottom < y2);
                    }

                    if (hit) {
                        // SELECT
                        if (selectee.selected) {
                            selectee.$element.removeClass("ui-selected ui-state-active");
                            selectee.selected = false;
                        }
                        if (selectee.unselecting) {
                            selectee.$element.removeClass("ui-unselecting ui-state-hover");
                            selectee.unselecting = false;
                        }
                        if (!selectee.selecting) {
                            selectee.$element.addClass("ui-selecting ui-state-hover");
                            selectee.selecting = true;
                            // selectable SELECTING callback
                            that._trigger("selecting", event, {
                                selecting: selectee.element
                            });
                        }
                    } else {
                        // UNSELECT
                        if (selectee.selecting) {
                            if ((event.metaKey || event.ctrlKey) && selectee.startselected) {
                                selectee.$element.removeClass("ui-selecting ui-state-hover");
                                selectee.selecting = false;
                                selectee.$element.addClass("ui-selected ui-state-active");
                                selectee.selected = true;
                            } else {
                                selectee.$element.removeClass("ui-selecting ui-state-hover");
                                selectee.selecting = false;
                                if (selectee.startselected) {
                                    selectee.$element.addClass("ui-unselecting ui-state-hover");
                                    selectee.unselecting = true;
                                }
                                // selectable UNSELECTING callback
                                that._trigger("unselecting", event, {
                                    unselecting: selectee.element
                                });
                            }
                        }
                        if (selectee.selected) {
                            if (!event.metaKey && !event.ctrlKey && !selectee.startselected) {
                                selectee.$element.removeClass("ui-selected ui-state-active");
                                selectee.selected = false;

                                selectee.$element.addClass("ui-unselecting ui-state-hover");
                                selectee.unselecting = true;
                                // selectable UNSELECTING callback
                                that._trigger("unselecting", event, {
                                    unselecting: selectee.element
                                });
                            }
                        }
                    }
                });
            }
            return false;
        },

        _mouseStop: function (event) {
            var that = this;

            this.dragged = false;

            $(".ui-unselecting", this.element[0]).each(function () {
                var selectee = $.data(this, "selectable-item");
                selectee.$element.removeClass("ui-unselecting ui-state-hover");
                selectee.unselecting = false;
                selectee.startselected = false;
                that._trigger("unselected", event, {
                    unselected: selectee.element
                });
            });
            $(".ui-selecting", this.element[0]).each(function () {
                var selectee = $.data(this, "selectable-item");
                selectee.$element.removeClass("ui-selecting ui-state-hover").addClass("ui-selected ui-state-active");
                selectee.selecting = false;
                selectee.selected = true;
                selectee.startselected = true;
                that._trigger("selected", event, {
                    selected: selectee.element
                });
            });
            this._trigger("stop", event);

            this.helper.remove();

            return false;
        }

    });

})(jQuery);
