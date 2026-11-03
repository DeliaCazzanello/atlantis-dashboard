import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AsyncView from '../components/AsyncView';
import Icon from '../components/Icon';
import useAsync from '../hooks/useAsync';
import usePropertyActions from '../hooks/usePropertyActions';
import { formatArea, formatMoney, initials, propertyStatus } from '../lib';
import { getMyProperty } from '../services/advisor';
import { getMyProfile } from '../services/users';
import './PropertyDetailPage.css';

// Fotos del inmueble: una grande y miniaturas para cambiarla.
function Gallery({ photos, title }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="o-card c-detail__gallery">
      <img className="c-detail__photo" src={photos[current]} alt={`${title}, foto ${current + 1} de ${photos.length}`} />
      {photos.length > 1 && (
        <ul className="c-detail__thumbs" aria-label="Fotos">
          {photos.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                className={`c-detail__thumb ${i === current ? 'is-current' : ''}`}
                aria-label={`Ver foto ${i + 1}`}
                aria-pressed={i === current}
                onClick={() => setCurrent(i)}
              >
                <img src={url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Persona con avatar de iniciales y sus datos de contacto (propietario, asesor).
function Person({ title, icon, name, role, email, phone, whatsapp }) {
  return (
    <section className="o-card c-detail__person" aria-label={title}>
      <h2 className="o-card__title c-detail__card-title"><Icon name={icon} size={16} /> {title}</h2>
      <div className="o-thumb">
        <span className="o-avatar" aria-hidden="true">{initials(name)}</span>
        <div>
          <p className="o-thumb__title">{name}</p>
          {role && <p className="o-thumb__meta">{role}</p>}
        </div>
      </div>
      <ul className="c-detail__contact">
        {email && <li><Icon name="mail" size={14} /> <a href={`mailto:${email}`}>{email}</a></li>}
        {phone && <li><Icon name="phone" size={14} /> <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a></li>}
        {whatsapp && (
          <li><Icon name="whatsapp" size={14} /> <a href={whatsapp} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a></li>
        )}
      </ul>
    </section>
  );
}

function Detail({ property: p, advisor, actions }) {
  const status = propertyStatus(p);
  const inactive = p.activo === false;
  const photos = p.imagenes.length ? p.imagenes : [p.foto];
  const specs = [
    ['Tipo', p.tipo],
    ['Superficie', p.metros_cuadrados != null && formatArea(p.metros_cuadrados)],
    ['Habitaciones', p.habitaciones],
    ['Baños', p['baños']],
    ['Estatus legal', p.estatus_legal],
  ].filter(([, value]) => value != null && value !== false && value !== '');

  return (
    <>
      <div className="o-page-head">
        <div className="c-detail__head">
          <p className="o-eyebrow">Mis inmuebles</p>
          <h1 className="o-title">{p.titulo}</h1>
          <p className="c-detail__place">
            <Icon name="pin" size={15} /> {p.ubicacion}
            <span className={`o-badge o-badge--${status.key}`}>{status.label}</span>
          </p>
        </div>
        <div className="c-detail__actions">
          <button type="button" className="o-btn o-btn--navy" onClick={() => actions.edit(p)}>
            <Icon name="edit" size={15} /> Editar
          </button>
          {inactive ? (
            <button type="button" className="o-btn o-btn--lime" onClick={() => actions.reactivate(p)}>
              <Icon name="eye" size={15} /> Reactivar
            </button>
          ) : (
            <button type="button" className="o-btn o-btn--ghost c-detail__danger" onClick={() => actions.deactivate(p)}>
              <Icon name="eyeOff" size={15} /> Desactivar
            </button>
          )}
        </div>
      </div>
      {actions.notice && <p className="o-notice" role="status">{actions.notice}</p>}
      {actions.failure && <p className="o-error c-detail__failure" role="alert">{actions.failure}</p>}
      {inactive && (
        <p className="c-detail__inactive"><Icon name="eyeOff" size={15} /> Este inmueble está inactivo: no aparece en el catálogo de Atlantis.</p>
      )}

      <div className="c-detail">
        <div className="c-detail__main">
          <Gallery photos={photos} title={p.titulo} />

          <section className="o-card">
            <h2 className="o-card__title c-detail__card-title"><Icon name="home" size={16} /> Descripción</h2>
            <p className="c-detail__text">{p.descripcion?.trim() || 'Este inmueble aún no tiene descripción.'}</p>
          </section>

          <section className="o-card">
            <h2 className="o-card__title c-detail__card-title"><Icon name="area" size={16} /> Características</h2>
            <dl className="c-detail__specs">
              {specs.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="c-detail__side">
          <section className="o-card o-kpi--hero c-detail__prices" aria-label="Precios">
            {p.inmueble_modalidad.map((m) => (
              <div key={m.tipo_operacion} className="c-detail__price">
                <p className="c-detail__op">{m.tipo_operacion === 'alquiler' ? 'Alquiler' : 'Venta'}</p>
                <p className="c-detail__amount">
                  {formatMoney(m.precio)}
                  {m.tipo_operacion === 'alquiler' && <small>/mes</small>}
                </p>
                {m.estado_comercial && <p className="c-detail__state">{m.estado_comercial}</p>}
              </div>
            ))}
          </section>

          {advisor && (
            <Person
              title="Asesor a cargo"
              icon="key"
              name={advisor.name}
              role="Asesor inmobiliario"
              email={advisor.email}
              phone={advisor.phone}
              whatsapp={advisor.whatsapp}
            />
          )}
          {p.propietario && (
            <Person
              title="Propietario"
              icon="users"
              name={p.propietario.nombre}
              email={p.propietario.correo}
              phone={p.propietario.telefono}
            />
          )}
        </aside>
      </div>
    </>
  );
}

export default function PropertyDetailPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [version, setVersion] = useState(0); // sube tras guardar para volver a cargar el inmueble
  const actions = usePropertyActions(user.id, () => setVersion((v) => v + 1));
  // El perfil del asesor es opcional: si falla, la ficha se muestra igual sin esa tarjeta.
  const state = useAsync(
    () => Promise.all([getMyProperty(user.id, id), getMyProfile(user.id).catch(() => null)]),
    [user.id, id, version],
  );

  // Vuelve a la lista (con sus filtros); si se entró directo por la URL, a Mis inmuebles.
  const goBack = () => (location.key === 'default' ? navigate('/inmuebles') : navigate(-1));

  return (
    <>
      <button type="button" className="c-back" onClick={goBack}>
        <Icon name="arrowLeft" size={16} /> Volver
      </button>
      <AsyncView state={state}>
        {([property, advisor]) => (property ? <Detail property={property} advisor={advisor} actions={actions} /> : (
          <p className="o-card o-empty">
            Este inmueble no existe o no está en tu cartera. <Link to="/inmuebles">Ver mis inmuebles</Link>
          </p>
        ))}
      </AsyncView>
      {actions.modals}
    </>
  );
}
