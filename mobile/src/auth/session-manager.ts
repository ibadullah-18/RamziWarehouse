import type { AuthSession } from './auth-types';

export interface SessionDependencies {
  load(): Promise<AuthSession | null>;
  save(session: AuthSession): Promise<void>;
  clear(): Promise<void>;
  refresh(token: string): Promise<AuthSession>;
  revoke(token: string): Promise<void>;
  invalid(error: unknown): boolean;
  now(): number;
}

/** One owner for rotating tokens, persistence and logout across every API client. */
export class SessionManager {
  private current: AuthSession | null = null;
  private version = 0;
  private restoration: Promise<void> | null = null;
  private refreshFlight: Promise<AuthSession> | null = null;
  private refreshVersion = -1;
  private writes: Promise<void> = Promise.resolve();
  private listeners = new Set<(session: AuthSession | null) => void>();

  constructor(private readonly dependencies: SessionDependencies) {}

  subscribe(listener: (session: AuthSession | null) => void) {
    this.listeners.add(listener);
    listener(this.current);
    return () => { this.listeners.delete(listener); };
  }

  private publish(session: AuthSession | null) {
    this.current = session;
    this.listeners.forEach(listener => listener(session));
  }

  private persist(action: () => Promise<void>) {
    const write = this.writes.then(action);
    this.writes = write.catch(() => {});
    return write;
  }

  async restore() {
    if (!this.restoration) {
      const version = this.version;
      this.restoration = this.dependencies.load().then(session => {
        if (version === this.version) this.publish(session);
      });
      this.restoration.catch(() => { this.restoration = null; });
    }
    await this.restoration;
  }

  async accept(session: AuthSession) {
    const version = ++this.version;
    await this.persist(() => this.dependencies.save(session));
    if (version === this.version) this.publish(session);
    this.restoration = Promise.resolve();
  }

  private refresh() {
    if (this.refreshFlight && this.refreshVersion === this.version) return this.refreshFlight;
    const session = this.current;
    if (!session) return Promise.reject(new Error('Sessiya yoxdur.'));
    const version = this.version;
    const flight = (async () => {
      try {
        const next = await this.dependencies.refresh(session.refreshToken);
        if (version === this.version) {
          await this.persist(() => this.dependencies.save(next));
          if (version === this.version) this.publish(next);
        }
        return next;
      } catch (error) {
        if (version === this.version && this.dependencies.invalid(error)) {
          ++this.version;
          this.publish(null);
          await this.persist(() => this.dependencies.clear());
        }
        throw error;
      }
    })();
    this.refreshFlight = flight;
    this.refreshVersion = version;
    void flight.finally(() => {
      if (this.refreshFlight === flight) this.refreshFlight = null;
    }).catch(() => {});
    return flight;
  }

  async accessToken(rejectedToken?: string): Promise<string | null> {
    await this.restore();
    const session = this.current;
    if (!session) return null;
    // A concurrent request may already have replaced the rejected access token.
    if (rejectedToken && rejectedToken !== session.accessToken) return session.accessToken;
    const expires = Date.parse(session.accessTokenExpiresAtUtc);
    if (!rejectedToken && Number.isFinite(expires) && expires > this.dependencies.now() + 60_000) {
      return session.accessToken;
    }
    const version = this.version;
    const next = await this.refresh();
    return version === this.version && this.current ? next.accessToken : null;
  }

  async signOut() {
    await this.restore();
    let token = this.current?.refreshToken;
    const flight = this.refreshFlight;
    ++this.version;
    this.publish(null);
    await this.persist(() => this.dependencies.clear());
    if (flight) {
      try { token = (await flight).refreshToken; } catch { /* Revoke the last known token. */ }
    }
    if (token) await this.dependencies.revoke(token);
  }
}
