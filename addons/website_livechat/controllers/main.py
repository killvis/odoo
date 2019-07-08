# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http
from odoo.http import request


class WebsiteLivechat(http.Controller):

    @http.route('/livechat/', type='http', auth="public", website=True)
    def channel_list(self, **kw):
        # display the list of the channel
        channels = request.env['im_livechat.channel'].search([('website_published', '=', True)])
        values = {
            'channels': channels
        }
        return request.render('website_livechat.channel_list_page', values)


    @http.route('/livechat/channel/<model("im_livechat.channel"):channel>', type='http', auth='public', website=True)
    def channel_rating(self, channel, **kw):
        # get the last 100 ratings and the repartition per grade
        domain = [
            ('res_model', '=', 'mail.channel'), ('res_id', 'in', channel.sudo().channel_ids.ids),
            ('consumed', '=', True), ('rating', '>=', 1),
        ]
        ratings = request.env['rating.rating'].search(domain, order='create_date desc', limit=100)
        repartition = channel.sudo().channel_ids.rating_get_grades(domain=domain)

        # compute percentage
        percentage = dict.fromkeys(['great', 'okay', 'bad'], 0)
        for grade in repartition:
            percentage[grade] = round(repartition[grade] * 100.0 / sum(repartition.values()), 1) if sum(repartition.values()) else 0

        # filter only on the team users that worked on the last 100 ratings and get their detailed stat
        ratings_per_partner = dict.fromkeys(ratings.mapped('rated_partner_id.id'), dict.fromkeys(['great', 'okay', 'bad'], 0))
        total_ratings_per_partner = dict.fromkeys(ratings.mapped('rated_partner_id.id'), 0)
        rating_texts = {10: 'great', 5: 'okay', 1: 'bad'}

        for rating in ratings:
            partner_id = rating.rated_partner_id.id
            ratings_per_partner[partner_id][rating_texts[rating.rating]] += 1
            total_ratings_per_partner[partner_id] += 1

        for partner_id, rating in ratings_per_partner.items():
            for k, v in ratings_per_partner[partner_id].items():
                ratings_per_partner[partner_id][k] = round(100 * v / total_ratings_per_partner[partner_id], 1)

        # the value dict to render the template
        values = {
            'channel': channel,
            'ratings': ratings,
            'team': channel.sudo().user_ids,
            'percentage': percentage,
            'ratings_per_user': ratings_per_partner
        }
        return request.render("website_livechat.channel_page", values)

    @http.route('/im_livechat/visitor_leave_session', type='json', auth="public", cors="*")
    def visitor_leave_session(self, uuid):
        """ Called when the livechat visitor leaves the conversation.
         This will clean the livechat request and warn the operator that the conversation is over.
         This allows also to re-send a new chat request to the visitor, as while the visitor is
         in conversation with an operator, it's not possible to send the visitor a chat request."""
        mail_channel = request.env['mail.channel'].sudo().search([('uuid', '=', uuid)])
        if mail_channel:
            # clear operator_id on the visitor
            if mail_channel.livechat_active:
                mail_channel.livechat_active = False
                # delete the chat request if any
                if mail_channel.livechat_request_ids:
                    for chat_request in mail_channel.livechat_request_ids:
                        chat_request.unlink()
                odoo_bot_pid = request.env.ref('base.user_root').sudo().partner_id.id
                leave_message = '%s has left the conversation.' % (
                    mail_channel.livechat_visitor_id.name if mail_channel.livechat_visitor_id
                    else 'The visitor')
                mail_channel.message_post(author_id=odoo_bot_pid, body=leave_message,
                                          message_type='comment', subtype='mt_comment')

    @http.route('/im_livechat/close_empty_livechat', type='json', auth="public", cors="*")
    def close_empty_livechat(self, uuid):
        """ Called when an operator send a chat request to a visitor but does not speak to him and closes
        the chatter. (when the operator does not complete the 'send chat request' flow in other terms)
        This will clean the chat request and allows operators to send the visitor a new chat request."""
        mail_channel = request.env['mail.channel'].sudo().search([('uuid', '=', uuid)])
        if mail_channel:
            mail_channel.channel_pin(uuid, False)
