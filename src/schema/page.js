import mongoose from 'mongoose';
import URLSlugs from 'mongoose-url-slugs';

let pageSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true, unique: true },
  nameslug: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  photos: [{
    originalFilename: { type: String },
    filename: { type: String },
    name: { type: String },
    contentType: { type: String },
    size: { type: Number },
    tags: []
  }]
});
pageSchema.set('autoIndex', (process.env.NODE_ENV === 'development'));
pageSchema.plugin(URLSlugs('name', { field: 'nameslug' }));

mongoose.model('Page', pageSchema);
