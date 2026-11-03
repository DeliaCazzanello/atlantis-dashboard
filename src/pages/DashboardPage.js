import { Link } from 'react-router-dom';
import AsyncView from '../components/AsyncView';
import Chart from '../components/Chart';
import Icon from '../components/Icon';
import useAsync from '../hooks/useAsync';
import { formatArea, formatDate, formatMoney, monthlySeries, propertyStatus } from '../lib';
import { getMyDeals, getMyProperties } from '../services/advisor';

export default function DashboardPage({ user }) {
  const state = useAsync(() => Promise.all([getMyDeals(user.id), getMyProperties(user.id)]), [user.id]);

  return (
    <>
      <div className="o-page-head">
        <div>
          <p className="o-eyebrow">Panel personal</p>
          <h1 className="o-title">Estadísticas mensuales</h1>
        </div>
      </div>

      <AsyncView state={state}>
        {([deals, properties]) => {
          const closed = deals.filter((d) => d.fecha);
          const sales = monthlySeries(closed, () => 1);
          const earnings = monthlySeries(closed, (d) => d.comision);
          const thisMonth = (series) => series[series.length - 1].value;

          return (
            <div className="o-stack">
              <section className="o-grid o-grid--kpi" aria-label="Resumen">
                <article className="o-card o-kpi o-kpi--hero">
                  <span className="o-kpi__icon"><Icon name="coins" size={22} /></span>
                  <div>
                    <p className="o-kpi__label">Comisión acumulada</p>
                    <p className="o-kpi__value">{formatMoney(closed.reduce((sum, d) => sum + d.comision, 0))}</p>
                    <p className="o-kpi__hint"><strong>+{formatMoney(thisMonth(earnings))}</strong> este mes</p>
                  </div>
                </article>
                <article className="o-card o-kpi">
                  <span className="o-kpi__icon"><Icon name="key" size={22} /></span>
                  <div>
                    <p className="o-kpi__label">Ventas cerradas</p>
                    <p className="o-kpi__value">{closed.length}</p>
                    <p className="o-kpi__hint"><strong>+{thisMonth(sales)}</strong> este mes</p>
                  </div>
                </article>
                <article className="o-card o-kpi">
                  <span className="o-kpi__icon"><Icon name="home" size={22} /></span>
                  <div>
                    <p className="o-kpi__label">Propiedades captadas</p>
                    <p className="o-kpi__value">{properties.length}</p>
                    <p className="o-kpi__hint"><strong>{properties.filter((p) => p.activo !== false).length}</strong> activas en el catálogo</p>
                  </div>
                </article>
              </section>

              <section className="o-card">
                <div className="o-card__head">
                  <h2 className="o-card__title">Rendimiento de mis ventas</h2>
                  <span className="o-muted">Últimos 6 meses</span>
                </div>
                <Chart data={sales} title="Ventas cerradas por mes" format={(v) => String(Math.round(v))} />
              </section>

              <div className="o-grid o-grid--split">
                <section className="o-card o-card--flush">
                  <div className="o-card__head">
                    <h2 className="o-card__title">Comisiones recientes</h2>
                    <Link className="c-more" to="/comisiones">Ver todas</Link>
                  </div>
                  {closed.length ? (
                    <div className="o-table-wrap">
                      <table className="o-table">
                        <thead>
                          <tr><th>Inmueble</th><th>Cliente</th><th>Fecha</th><th className="is-num">Comisión</th></tr>
                        </thead>
                        <tbody>
                          {closed.slice(0, 5).map((d) => (
                            <tr key={d.id}>
                              <td>
                                <div className="o-thumb">
                                  <img className="o-thumb__img" src={d.inmueble?.foto ?? '/img/house.jpg'} alt="" />
                                  <p className="o-thumb__title">{d.inmueble?.titulo ?? 'Inmueble'}</p>
                                </div>
                              </td>
                              <td>{d.cliente?.nombre ?? '—'}</td>
                              <td className="o-muted">{formatDate(d.fecha)}</td>
                              <td className="is-num is-strong">{formatMoney(d.comision)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="o-empty">Aún no tienes negociaciones cerradas.</p>}
                </section>

                <section className="o-card o-card--flush">
                  <div className="o-card__head">
                    <h2 className="o-card__title">Mis inmuebles</h2>
                    <Link className="c-more" to="/inmuebles">Ver todos</Link>
                  </div>
                  {properties.length ? (
                    <ul className="c-mini-list">
                      {properties.slice(0, 4).map((p) => {
                        const status = propertyStatus(p);
                        return (
                          <li key={p.id} className="c-mini-list__item">
                            <div className="o-thumb">
                              <img className="o-thumb__img" src={p.foto} alt="" />
                              <div>
                                <p className="o-thumb__title">{p.titulo}</p>
                                <p className="o-thumb__meta">{[p.habitaciones && `${p.habitaciones} hab.`, p['baños'] && `${p['baños']} baño${p['baños'] === 1 ? '' : 's'}`, p.metros_cuadrados != null && formatArea(p.metros_cuadrados)].filter(Boolean).join(' · ')}</p>
                              </div>
                            </div>
                            <span className={`o-badge o-badge--${status.key}`}>{status.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="o-empty">Aún no tienes inmuebles captados.</p>}
                </section>
              </div>
            </div>
          );
        }}
      </AsyncView>
    </>
  );
}
