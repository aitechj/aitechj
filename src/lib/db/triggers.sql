CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS subscriptions_user_active_unique
    ON subscriptions (user_id)
    WHERE status = 'active';

CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        UPDATE users 
        SET subscription_tier = NEW.plan_type 
        WHERE id = NEW.user_id;
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
        UPDATE users 
        SET subscription_tier = 'guest' 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_subscription_tier
    AFTER INSERT OR UPDATE ON subscriptions
    FOR EACH ROW EXECUTE PROCEDURE sync_user_subscription_tier();
