import mongoose from 'mongoose';
const { Schema } = mongoose;

const CharacterSheetSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, default: '' },
  player: { type: String, default: '' },
  chronicle: { type: String, default: '' },
  nature: { type: String, default: '' },
  demeanor: { type: String, default: '' },
  concept: { type: String, default: '' },
  essence: { type: String, default: '' },
  tradition: { type: String, default: '' },
  cabal: { type: String, default: '' },

  attributes: {
    physical: {
      fuerza: { type: Number, default: 1 },
      destreza: { type: Number, default: 1 },
      resistencia: { type: Number, default: 1 },
    },
    social: {
      carisma: { type: Number, default: 1 },
      manipulacion: { type: Number, default: 1 },
      apariencia: { type: Number, default: 1 },
    },
    mental: {
      percepcion: { type: Number, default: 1 },
      inteligencia: { type: Number, default: 1 },
      astucia: { type: Number, default: 1 },
    },
  },

  abilities: {
    talents: {
      alerta: { type: Number, default: 0 },
      arte: { type: Number, default: 0 },
      atletismo: { type: Number, default: 0 },
      callejeo: { type: Number, default: 0 },
      consciencia: { type: Number, default: 0 },
      empatía: { type: Number, default: 0 },
      expresión: { type: Number, default: 0 },
      intimidación: { type: Number, default: 0 },
      liderazgo: { type: Number, default: 0 },
      pelea: { type: Number, default: 0 },
      subterfugio: { type: Number, default: 0 },
    },
    skills: {
      armas_de_fuego: { type: Number, default: 0 },
      artes_marciales: { type: Number, default: 0 },
      artesania: { type: Number, default: 0 },
      conducir: { type: Number, default: 0 },
      documentación: { type: Number, default: 0 },
      etiqueta: { type: Number, default: 0 },
      meditación: { type: Number, default: 0 },
      pelea_con_armas: { type: Number, default: 0 },
      sigilo: { type: Number, default: 0 },
      supervivencia: { type: Number, default: 0 },
      tecnología: { type: Number, default: 0 },
    },
    knowledges: {
      academicismo: { type: Number, default: 0 },
      ciencias: { type: Number, default: 0 },
      cosmología: { type: Number, default: 0 },
      enigmas: { type: Number, default: 0 },
      esoterismo: { type: Number, default: 0 },
      informática: { type: Number, default: 0 },
      investigación: { type: Number, default: 0 },
      leyes: { type: Number, default: 0 },
      medicina: { type: Number, default: 0 },
      ocultismo: { type: Number, default: 0 },
      política: { type: Number, default: 0 },
    },
  },


  spheres: {
    correspondencia: { type: Number, default: 0 },
    entropia: { type: Number, default: 0 },
    fuerza: { type: Number, default: 0 },
    vida: { type: Number, default: 0 },
    materia: { type: Number, default: 0 },
    mente: { type: Number, default: 0 },
    prime: { type: Number, default: 0 },
    espíritu: { type: Number, default: 0 },
    tiempo: { type: Number, default: 0 },
  },

  advantages: {
    backgrounds: [{ name: { type: String }, value: { type: Number } }],
    arete: { type: Number, default: 1 },
    willpower: { type: Number, default: 1 },
    willpower_current: { type: Number, default: 1 },
    quintessence: { type: Number, default: 0 },
    paradox: { type: Number, default: 0 },
    merits_flaws: { type: String, default: '' },
  },

  health: {
    magullado: { type: Boolean, default: false },     
    lastimado: { type: Boolean, default: false },   
    lesionado: { type: Boolean, default: false },     
    herido: { type: Boolean, default: false },    
    malherido: { type: Boolean, default: false },    
    tullido: { type: Boolean, default: false },      
    incapacitado: { type: Boolean, default: false },  
  },


  experience: { type: Number, default: 0 },

}, { timestamps: true });

export default mongoose.model('CharacterSheet', CharacterSheetSchema);
