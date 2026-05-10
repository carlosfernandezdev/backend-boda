import { AuthBO } from '../bo/AuthBO.js';
import { validateLogin, validateRegister } from '../validators/authValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toUsuarioPublico } from '../models/Usuario.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const data = validateRegister(req.body);
    const { usuario, token } = await AuthBO.register(data);
    res.status(201).json({
      usuario: toUsuarioPublico(usuario),
      token,
    });
  }),

  login: asyncHandler(async (req, res) => {
    const data = validateLogin(req.body);
    const { usuario, token } = await AuthBO.login(data);
    res.json({
      usuario: toUsuarioPublico(usuario),
      token,
    });
  }),

  me: asyncHandler(async (req, res) => {
    const usuario = await AuthBO.getMe(req.user.id);
    res.json({ usuario: toUsuarioPublico(usuario) });
  }),
};
