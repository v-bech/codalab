﻿var BundleContentNode = (function() {
    function BundleContentNode(url, name, parent, children) {
        this.url = url;
        this.name = name;
        this.parent = parent;
        this.children = children;
    }
    BundleContentNode.prototype.isRootNode = function() {
        return this.parent === undefined;
    };
    BundleContentNode.prototype.isLeafNode = function() {
        return this.children === null;
    };
    BundleContentNode.prototype.getUrl = function() {
        return this.url;
    };
    BundleContentNode.prototype.getName = function() {
        return this.name;
    };
    BundleContentNode.prototype.getFullName = function() {
        if (this.isRootNode()) {
            return this.name;
        }
        return [this.parent.getFullName(), this.name].join('/');
    };
    BundleContentNode.prototype.getParent = function() {
        return this.parent;
    };
    BundleContentNode.prototype.getChildren = function() {
        return this.children;
    };
    BundleContentNode.prototype.setChildren = function(children) {
        this.children = children;
    };
    BundleContentNode.prototype.getData = function() {
        return this.data;
    };
    BundleContentNode.prototype.setData = function(data) {
        this.data = data;
    };
    return BundleContentNode;
})();

var BundleRenderer = (function() {
    function BundleRenderer(element) {
        this.template = element;
    }
    BundleRenderer.loadContentAsync = function(container, parent) {
        console.log('loadContentAsync');
        $.ajax({
            type: 'GET',
            url: [parent.getUrl(), parent.getFullName()].join('/'),
            cache: false,
            success: function(data) {
                console.log(data);
                console.log('');
                var children = [];
                if (Array.isArray(data) && data.length == 2) {
                    var set1 = data[0].map(function(item) {
                        return new BundleContentNode(parent.getUrl(), item, parent);
                    });
                    var set2 = data[1].map(function(item) {
                        return new BundleContentNode(parent.getUrl(), item, parent, null);
                    });
                    children = set1.concat(set2).sort(function(a, b) {
                        return a.getName().localeCompare(b.getName());
                    });
                }
                parent.setChildren(children);
                BundleRenderer.renderTable(container, BundleRenderer.getContentTableModel(parent, container));
            },
            error: function(xhr, status, err) {
            }
        });
    };

    BundleRenderer.loadFileContentAsync = function(container, node) {
        console.log('loadFileContentAsync');
        $.ajax({
            type: 'GET',
            url: [node.getUrl().replace('api/bundles/content', 'api/bundles/filecontent'), node.getFullName()].join('/'),
            cache: false,
            success: function(data) {
                console.log(data);
                console.log('');
                node.setData(data);
                BundleRenderer.renderTable(container, BundleRenderer.getContentTableModel(node, container));
            },
            error: function(xhr, status, err) {
            }
        });
    };

    BundleRenderer.getContentTableModel = function(node, container) {
        var numRows = 0;
        if (node.isRootNode() === false) {
            numRows += 1;
        }
        if (node.isLeafNode()) {
            numRows += 1;
        } else {
            var children = node.getChildren();
            if (children !== undefined) {
                numRows += children.length;
            }
        }

        var renderHeaderKey = function(element) {
            element.setAttribute('class', 'col bundle__file_view__icon');
            var innerElement = document.createElement('i');
            innerElement.setAttribute('class', 'fi-arrow-left');
            element.appendChild(innerElement);
            innerElement.onclick = function(e) {
                BundleRenderer.loadContentAsync(container, node.getParent());
                e.preventDefault();
            };
        };
        var renderHeaderValue = function(element) {
            element.setAttribute('class', 'col bundle-item-type-goup');

            var parents = [];
            var parent = node.getParent();
            while (parent !== undefined) {
                parents.push(parent);
                parent = parent.getParent();
            }
            parents.reverse().forEach(function(p) {
                var link = document.createElement('a');
                link.textContent = p.getName();
                link.setAttribute('href', '');
                link.onclick = function(e) {
                    BundleRenderer.loadContentAsync(container, p);
                    e.preventDefault();
                };
                element.appendChild(link);
                element.appendChild(document.createTextNode(' / '));
            });
            element.appendChild(document.createTextNode(node.getName()));
        };
        var renderKey = function(element, child) {
            element.setAttribute('class', 'col bundle__file_view__icon');
            var e = document.createElement('i');
            if (child !== undefined) {
                e.setAttribute('class', child.isLeafNode() ? 'fi-page' : 'fi-folder');
            }
            element.appendChild(e);
        };
        var renderValue = function(element, child) {
            if (child.isLeafNode()) {
                element.setAttribute('class', 'col');
                var link = document.createElement('a');
                link.textContent = child.getName();
                link.setAttribute('href', '');
                link.onclick = function(e) {
                    BundleRenderer.loadFileContentAsync(container, child);
                    e.preventDefault();
                };
                element.appendChild(link);
            } else {
                element.setAttribute('class', 'col bundle-item-type-folder');
                var link = document.createElement('a');
                link.textContent = child.getName();
                link.setAttribute('href', '');
                link.onclick = function(e) {
                    BundleRenderer.loadContentAsync(container, child);
                    e.preventDefault();
                };
                element.appendChild(link);
            }
        };
        var renderTextContent = function(element, node) {
            var block = document.createElement('pre');
            block.setAttribute('class', 'bundle__file_pre');
            block.textContent = node.getData();
            return [block];
        };
        var renderImageContent = function(element, node) {
            var img = document.createElement('img');
            var url = [node.getUrl().replace('api/bundles/content', 'api/bundles/filecontent'), node.getFullName()].join('/');
            img.setAttribute('src', url);
            img.setAttribute('style', 'max-width:900px');
            return [img];
        };
        var renderHtmlContent = function(element, node) {
            var iframe = document.createElement('iframe');
            var url = [node.getUrl().replace('api/bundles/content', 'api/bundles/filecontent'), node.getFullName()].join('/');
            iframe.setAttribute('src', url);
            iframe.setAttribute('style', 'width:100%; min-height:' + Math.max(200, Math.min(900, screen.height / 2)) + 'px;');
            return [iframe];
        };
        var render_methods = {
            'txt': renderTextContent,
            'htm': renderHtmlContent,
            'html': renderHtmlContent,
            'jpg': renderImageContent,
            'png': renderImageContent
    };
        var renderContentValue = function(element, node) {
            var fname = node.getName();
            var ext = '';
            if (fname.indexOf('.') > 0) {
                ext = fname.toLowerCase().split('.').pop();
            }
            var method = render_methods[ext];
            if (method === undefined) {
                method = render_methods['txt'];
            }
            element.setAttribute('class', 'col');
            method(element, node).forEach(function(e) { element.appendChild(e); });
        };

        return {
            tableDecorations: 'bundle__file_view expanded',
            rowDecorations: 'row',
            numRows: numRows,
            numCols: 2,
            render: function(row, col, td) {
                if ((node.isRootNode() === false) && (row <= 0)) {
                    if (col == 0) {
                        renderHeaderKey(td);
                    } else {
                        renderHeaderValue(td);
                    }
                    return;
                }

                if (node.isLeafNode() === true) {
                    if (col == 0) {
                        renderKey(td);
                    } else {
                        renderContentValue(td, node);
                    }
                } else {
                    var offset = 0;
                    if (node.isRootNode() === false) {
                        offset = 1;
                    }
                    var children = node.getChildren();
                    var child = children[row - offset];
                    if (col == 0) {
                        renderKey(td, child);
                    } else {
                        renderValue(td, child);
                    }
                }
            }
        };
    };

    BundleRenderer.getMetadataTableModel = function(data) {
        var rows = [];
        for (var k in data.metadata) {
            console.log(k);
            if(k == "description"){
                rows.push([k, data.metadata[k]]);
            }
            // if (k !== 'name') {
            //     rows.push([k, data.metadata[k]]);
            // }
        }

        var renderKey = function(element, row, col) {
            element.setAttribute('class', 'col bundle__meta_type');
            element.textContent = rows[row][col];
        };
        var renderValue = function(element, row, col) {
            element.setAttribute('class', 'col');
            element.textContent = rows[row][col];
        };

        return {
            tableDecorations: 'bundle__meta_table',
            rowDecorations: 'row',
            numRows: rows.length,
            numCols: 2,
            render: function(row, col, td) {
                if (col == 0) {
                    renderKey(td, row, col);
                } else {
                    renderValue(td, row, col);
                }
            }
        };
    };

    BundleRenderer.getElementType = function(value, defaultValue) {
        if (value !== undefined) {
            return value;
        }
        return defaultValue;
    };

    BundleRenderer.renderTable = function(container, model) {
        var tableElementType = BundleRenderer.getElementType(model.tableElementType, 'table');
        var rowElementType = BundleRenderer.getElementType(model.rowElementType, 'tr');
        var columnElementType = BundleRenderer.getElementType(model.columnElementType, 'td');
        var table = document.createElement(tableElementType);
        if (model.tableDecorations !== undefined) {
            table.setAttribute('class', model.tableDecorations);
        }
        for (var ir = 0; ir < model.numRows; ir++) {
            var tr = document.createElement(rowElementType);
            if (model.numCols > 0) {
                for (var ic = 0; ic < model.numCols; ic++) {
                    var td = document.createElement(columnElementType);
                    model.render(ir, ic, td);
                    tr.appendChild(td);
                }
            } else {
                model.render(ir, tr);
            }
            table.appendChild(tr);
        }
        if (container.firstChild != undefined) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(table);
    };

    BundleRenderer.prototype.render = function(data) {
        var clone = $(this.template.cloneNode(true));

        clone.find('.bundle-name').text(data.metadata.name);
        clone.find('.bundle-icon-sm')
            .removeClass('bundle-icon-sm')
            .addClass('bundle-icon-sm--' + data.bundle_type + '--' + data.state);
        clone.find('.bundle-uuid').text(data.uuid);
        clone.find('.bundle-link').attr('href', '/bundles/' + data.uuid);
        clone.find('.bundle-download').on('click', function(e) {
            // alert('This will allow you to download the bundle TODO');
            e.preventDefault();
            console.log(e);
            console.log(container.get(0));
            root = new BundleContentNode('/api/bundles/content', data.uuid);
            console.log(root);


        });
        var metaContainer = clone.find('.bundle-meta-view-container').get(0);
        BundleRenderer.renderTable(metaContainer, BundleRenderer.getMetadataTableModel(data));

        var toggle = clone.find('.bundle__expand_button');
        var container = clone.find('.bundle-file-view-container');
        toggle.on('click', function(e) {
            var button = $(e.target);
            if (button.hasClass('expanded')) {
                container.removeClass('expanded');
                container.children().removeClass('expanded');
                button.removeClass('expanded');
                button.html('SHOW BUNDLE CONTENT<img src="/static/img/expand-arrow.png" alt="More">');
            } else {
                if (container.get(0).firstChild == undefined) {
                    var root = new BundleContentNode('/api/bundles/content', data.uuid);
                    BundleRenderer.loadContentAsync(container.get(0), root);
                } else {
                    container.children().addClass('expanded');
                }
                container.addClass('expanded');
                button.addClass('expanded');
                button.html('HIDE BUNDLE CONTENT<img src="/static/img/expand-arrow.png" alt="Less">');
            }
            e.preventDefault();
        });

        return clone.get(0);
    };
    return BundleRenderer;
})();

var WorkshhetDirectiveRenderer = (function() {
    function WorkshhetDirectiveRenderer() {
        var _this = this;
        _this.display = 'inline';

        _this.bundleBlock = null;

        _this.tableDirective = [];

        _this.applyDirective = function(element, item) {
            switch (item[1].directive) {
                case 'display': {
                    _this.display = item[1].display;
                    _this.applyPendingDirectives(element);
                    break;
                }
                case 'image': {
                    $(element).append(
                        $('<img />', {
                            'src': '/api/bundles/filecontent/' + _this.bundleBlock.uuid + '/' + encodeURI(item[1].path),
                            'class': 'bundleImage',
                            'alt': item[1].name
                        }));
                    break;
                }
                case 'metadata': {
                    _this.tableDirective.push(item[1]);
                    break;
                }
            }
        };

        _this.insertRowTable = function(element, data, cell) {
            var headerRow = $('<tr></tr>');
            data.forEach(function(datum) {
                headerRow.append($(cell).text(datum));
            });
            element.append(headerRow);
        };

        _this.getDataFromPath = function(path) {
            return _this.bundleBlock.metadata[path];
        };

        _this.applyPendingDirectives = function(element) {
            if (_this.tableDirective.length > 0) {
                var table = $('<table></table>');

                if (_this.display === 'table') {
                    var thead = $('<thead></thead>');
                    _this.insertRowTable(thead, _this.tableDirective.map(function(e) {
                        return e.name;
                    }), '<th></th>');
                }

                var tbody = $('<tbody></tbody>');
                if (_this.display === 'table') {
                    _this.insertRowTable(tbody, _this.tableDirective.map(function(e) {
                        return _this.getDataFromPath(e.path);
                    }), '<td></td>');
                }
                else {
                    _this.tableDirective.forEach(function(e) {
                        _this.insertRowTable(tbody, [e.name, _this.getDataFromPath(e.path)], '<td></td>');
                    });
                }

                table.append(thead);
                table.append(tbody);
                $(element).append(table);

                _this.tableDirective = [];
            }
        };
    }
    return WorkshhetDirectiveRenderer;
})();

var WorksheetRenderer = (function() {
    function WorksheetRenderer(element, renderer, data) {
        this.renderer = renderer;
        if (data && data.items && Array.isArray(data.items)) {
            var _this = this;
            var title = data.name;
            var title_items = data.items.filter(function(item) { return item[2] === 'title' });
            if (title_items.length > 0) {
                title = markdown.toHTML('#' + title_items[0][1]).replace(/^<h1>/, '').replace(/<\/h1>$/, '');
            }
            $('.worksheet-icon').html(title);
            $('.worksheet-author').html('by ' + data.owner);
            var directiveRenderer = new WorkshhetDirectiveRenderer();
            var markdownBlock = '';
            // Add an EOF block to ensure the block transitions always apply within the loop
            data.items.push([null, 'eof', null]);
            var blocks = data.items.forEach(function(item, idxItem, items) {
                // Apply directives when the markdown item type changes
                if (item[2] != 'directive')
                    directiveRenderer.applyPendingDirectives(element);

                if (item[2] != 'markup' && markdownBlock.length > 0) {
                    var e = document.createElement('div');
                    e.innerHTML = markdown.toHTML(markdownBlock);
                    element.appendChild(e);
                    markdownBlock = '';
                }
                switch (item[2]) {
                    case 'markup': {
                        markdownBlock += item[1] + '\n\r';
                        break;
                    }
                    case 'bundle': {

                        // Only display bundle if its not empty, this allows ability to hide bundles.
                        // if (item[1]) {
                            element.appendChild(_this.renderer.render(item[0]));
                        // }
                        break;
                    }
                    case 'directive': {
                        // Find bundle ID context
                        items.slice(idxItem + 1).forEach(function(bundleCandidate) {
                            if (bundleCandidate[2] == 'bundle') directiveRenderer.bundleBlock = bundleCandidate[0];
                        });
                        directiveRenderer.applyDirective(element, item);
                        break;
                    }
                }
            });

            MathJax.Hub.Queue(['Typeset', MathJax.Hub, element.id]);
            MathJax.Hub.Queue(function() {
                var all = MathJax.Hub.getAllJax();
                for (var i = 0; i < all.length; i += 1) {
                    $(all[i].SourceElement().parentNode).addClass('coda-jax');
                }
            });
        }
    }
    return WorksheetRenderer;
})();
