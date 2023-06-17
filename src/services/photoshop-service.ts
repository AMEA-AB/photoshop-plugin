import { storage } from 'uxp';

import { action, app, constants, core } from 'photoshop';
import type { Layer } from "photoshop/dom/Layer";
import type { Document } from 'photoshop/dom/Document';
import { SaveOptions } from 'photoshop/dom/Constants';

class PhotoShopService {
  public static openPhotoshopFile(file: storage.File) {
    return core.executeAsModal(async () => {
      await app.open(file as unknown as File)
    }, { commandName: 'Opening file' });
  }

  public static closeDocument(saveOptions: SaveOptions = constants.SaveOptions.DONOTSAVECHANGES) {
    return core.executeAsModal(async () => {
      await app.activeDocument.close(saveOptions)
    }, { commandName: 'Closing document' });
  }

  public static invertLayer(layer: Layer, invert: boolean) {
    return action.batchPlay(
      [
        {
          _obj: invert ? 'show' : 'hide',
          null: [
            {
              _ref: [
                {
                  _ref: 'solidFill',
                  _index: 1,
                },
                {
                  _ref: 'layer',
                  _id: layer.id,
                },
              ],
            },
          ],
        },
      ],
      { modalBehavior: 'execute' }
    );
  }

  public static hideLayer(layer: Layer, hide: boolean) {
    return action.batchPlay(
      [
        {
          _obj: hide ? 'hide' : 'show',
          null: [
            {
              _ref: 'layer',
              _id: layer.id,
            },
          ],
        },
      ],
      { modalBehavior: 'execute' }
    );
  }

  public static mirrorDocument(document: Document) {
    return action.batchPlay(
      [
        {
          _obj: 'flip',
          _target: [
            {
              _ref: 'document',
              _id: document.id,
            },
          ],
          axis: {
            _enum: 'orientation',
            _value: 'horizontal',
          },
        },
      ],
      { modalBehavior: 'execute' }
    );
  }

  public static setImage(layer: Layer, image: storage.File) {
    const targetWidth = layer.bounds.width;
    const targetHeight = layer.bounds.height;

    return action
      .batchPlay(
        [
          {
            _obj: 'select',
            _target: [
              {
                _ref: 'layer',
                _id: layer.id,
              },
            ],
            makeVisible: false,
            _isCommand: true,
          },
          {
            _obj: 'placedLayerReplaceContents',
            null: {
              _path: storage.localFileSystem.createSessionToken(image),
              _kind: 'local',
            },
            _isCommand: true,
          },
        ],
        { modalBehavior: 'execute' }
      )
      .then(() => {
        const scaleX = (targetWidth / layer.bounds.width) * 100;
        const scaleY = (targetHeight / layer.bounds.height) * 100;
        return layer.scale(scaleX, scaleY, constants.AnchorPosition.MIDDLECENTER);
      });
  }

  public static setText(layer: Layer, text: string) {
    if (text) {
      return action.batchPlay(
        [
          {
            _obj: 'set',
            _target: [
              {
                _ref: 'layer',
                _id: layer.id,
              },
            ],
            to: {
              _obj: 'textLayer',
              textKey: text,
            },
          },
        ],
        { modalBehavior: 'execute' }
      );
    }
    return this.hideLayer(layer, true);
  }
}

export default PhotoShopService;
