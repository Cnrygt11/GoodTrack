START TRANSACTION;
CREATE TABLE audit_logs (
    id text NOT NULL,
    user_id character varying(100),
    entity_name character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    key_values text NOT NULL,
    old_values text,
    new_values text,
    timestamp timestamp with time zone NOT NULL,
    CONSTRAINT pk_audit_logs PRIMARY KEY (id)
);

CREATE INDEX ix_audit_logs_entity_name ON audit_logs (entity_name);

CREATE INDEX ix_audit_logs_timestamp ON audit_logs (timestamp);

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20260709174003_AddAuditLogTable', '9.0.4');

COMMIT;

