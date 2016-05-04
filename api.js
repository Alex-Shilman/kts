import register from './services/register';
import activate from './services/activate';
import signin from './services/signin';
import signout from './services/signout';
import { profileApi } from './services/profile';

const api = {
  register,
  activate,
  signin,
  signout,
  profile: profileApi.profile,
  uploadImage: profileApi.uploadProfilePicture,
  getPhotos: profileApi.getProfilePhotos
};

export { api };
