import { logger } from '../util/logger';

import workflowFactory from '../util/workflow';
import mongoose from 'mongoose';

const albumApi = {

  createAlbum(req, res, next) {
    const workflow = workflowFactory(req, res);

    workflow.on('validateAlbum', function () {
      const album = req.body;

      if (!album.name) {
        workflow.outcome.errfor.name = 'Required';
      }

      if (!album.photos || album.photos.length < 1) {
        workflow.outcome.errors.push('Cannot create empty album');
      }

      if (workflow.hasErrors()) {
        return workflow.emit('response');
      }

      workflow.album = album;
      workflow.emit('createAlbum');
    });

    workflow.on('createAlbum', function () {
      let query = {
        $push: {
          albums: {
            name: req.body.name,
            cover: workflow.album.photos[0],
            photos: workflow.album.photos
          }
        }
      };
      mongoose.model('Page').findOneAndUpdate({
        nameslug: req.params.nameslug,
        owner: req.user
      }, query, function (err, doc) {
        if (err) {
          logger.instance.error('Error while saving album', err);
          workflow.outcome.errors.push('Cannot create album');
          return workflow.emit('response');
        }
        workflow.outcome.result = doc;
        return workflow.emit('response');
      });
    });

    workflow.emit('validateAlbum');
  }
};

export { albumApi };