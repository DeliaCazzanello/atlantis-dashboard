import Icon from './Icon';

// Selector con etiqueta. options: [[valor, texto]]; placeholder agrega una opción vacía al inicio (p. ej. "Todos").
export default function SelectField({ id, label, value, onChange, options, placeholder }) {
  return (
    <div className="o-field">
      <label className="o-field__label" htmlFor={id}>{label}</label>
      <div className="o-field__control">
        <select id={id} className="o-field__input" value={value} onChange={(e) => onChange(e.target.value)}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
        </select>
        <span className="o-field__icon"><Icon name="chevron" size={16} /></span>
      </div>
    </div>
  );
}
