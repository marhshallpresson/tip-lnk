import { relations } from "drizzle-orm/relations";
import { user, notifications, passwordResetToken, session, fiatPaymentIntents, adminAuditLogs, oauthClients, oauthTokens, emailVerificationToken, roles, userRoles, analyticsDaily } from "./schema";

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(user, {
		fields: [notifications.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	notifications: many(notifications),
	passwordResetTokens: many(passwordResetToken),
	sessions: many(session),
	fiatPaymentIntents: many(fiatPaymentIntents),
	adminAuditLogs: many(adminAuditLogs),
	oauthClients: many(oauthClients),
	oauthTokens: many(oauthTokens),
	emailVerificationTokens: many(emailVerificationToken),
	userRoles: many(userRoles),
	analyticsDailies: many(analyticsDaily),
}));

export const passwordResetTokenRelations = relations(passwordResetToken, ({one}) => ({
	user: one(user, {
		fields: [passwordResetToken.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const fiatPaymentIntentsRelations = relations(fiatPaymentIntents, ({one}) => ({
	user: one(user, {
		fields: [fiatPaymentIntents.creatorId],
		references: [user.id]
	}),
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({one}) => ({
	user: one(user, {
		fields: [adminAuditLogs.adminId],
		references: [user.id]
	}),
}));

export const oauthClientsRelations = relations(oauthClients, ({one, many}) => ({
	user: one(user, {
		fields: [oauthClients.userId],
		references: [user.id]
	}),
	oauthTokens: many(oauthTokens),
}));

export const oauthTokensRelations = relations(oauthTokens, ({one}) => ({
	oauthClient: one(oauthClients, {
		fields: [oauthTokens.clientId],
		references: [oauthClients.id]
	}),
	user: one(user, {
		fields: [oauthTokens.userId],
		references: [user.id]
	}),
}));

export const emailVerificationTokenRelations = relations(emailVerificationToken, ({one}) => ({
	user: one(user, {
		fields: [emailVerificationToken.userId],
		references: [user.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	user: one(user, {
		fields: [userRoles.userId],
		references: [user.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
}));

export const analyticsDailyRelations = relations(analyticsDaily, ({one}) => ({
	user: one(user, {
		fields: [analyticsDaily.userId],
		references: [user.id]
	}),
}));