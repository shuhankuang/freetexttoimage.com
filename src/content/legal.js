export const legalContent = {
  en: {
    common: {
      back: "Back to home",
      terms: "Terms",
      privacy: "Privacy",
      updated: "Last updated: September 13, 2026",
      contact: "Questions? Contact hello@freetexttoimage.com",
    },
    terms: {
      title: "Terms of Service",
      description: "Read the terms for using FreeTexttoImage, including account responsibilities, acceptable use, AI-generated content, and service availability.",
      intro: "By using FreeTexttoImage, you agree to these terms.",
      sections: [
        { title: "Use of the service", body: "You may use the service to create and manage AI-generated images. You are responsible for your prompts, uploaded references, generated images, and how you use them." },
        { title: "Acceptable use", body: "Do not use the service for illegal, harmful, abusive, or infringing content. You must have the right to use anything you upload and must not attempt to disrupt or misuse the service." },
        { title: "AI-generated content", body: "AI results can be inaccurate, unexpected, or similar to content created for others. Review every result before using or publishing it. We do not guarantee that an output is unique or suitable for a particular purpose." },
        { title: "Availability", body: "The service may change, pause, or stop without notice. We may limit or suspend access when needed to protect the service or other users." },
        { title: "Changes and contact", body: "We may update these terms as the service evolves. Continued use after an update means you accept the revised terms. Contact us if you have questions." },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      description: "Learn how FreeTexttoImage handles account details, prompts, uploaded images, generated images, data security, and deletion requests.",
      intro: "This policy explains what information we collect and how we use it.",
      sections: [
        { title: "Information we collect", body: "We may store your email, account profile, prompts, generation settings, uploaded reference images, generated images, and basic technical information needed to operate the service." },
        { title: "How we use it", body: "We use this information to sign you in, generate and store images, provide your creations library, prevent abuse, and improve reliability." },
        { title: "Data security", body: "We use reasonable safeguards to protect your information. Your account data and creations are not made available to other users unless you choose to share them or their public image links. We do not sell your personal information." },
        { title: "Image privacy", body: "Generated images are delivered through public, hard-to-guess links. Anyone who has a link may be able to view the image, so do not submit confidential or sensitive content." },
        { title: "Control and contact", body: "You can delete creations from your library. Some records may remain temporarily in backups or provider systems. Contact us with privacy questions or deletion requests." },
      ],
    },
  },
  ja: {
    common: {
      back: "ホームへ戻る",
      terms: "利用規約",
      privacy: "プライバシー",
      updated: "最終更新日：2026年9月13日",
      contact: "お問い合わせ：hello@freetexttoimage.com",
    },
    terms: {
      title: "利用規約",
      description: "アカウントの責任、禁止事項、AI生成コンテンツ、サービス提供を含む、FreeTexttoImageの利用条件をご確認ください。",
      intro: "FreeTexttoImageを利用することで、本規約に同意したものとみなされます。",
      sections: [
        { title: "サービスの利用", body: "本サービスでは、AI画像の生成と管理ができます。プロンプト、参考画像、生成画像、およびそれらの利用については、利用者が責任を負います。" },
        { title: "禁止事項", body: "違法、有害、権利侵害または嫌がらせにつながる目的で利用しないでください。アップロードする素材を利用する権利を持ち、サービスの妨害や不正利用を行わないものとします。" },
        { title: "AI生成コンテンツ", body: "AIの生成結果には、不正確または予期しない内容が含まれ、他の利用者の結果と似る場合があります。公開・利用する前に必ず内容を確認してください。" },
        { title: "サービスの提供", body: "本サービスは予告なく変更、一時停止または終了することがあります。サービスや利用者を保護するため、利用を制限または停止する場合があります。" },
        { title: "規約の変更とお問い合わせ", body: "サービスの変更に合わせて本規約を更新する場合があります。更新後も利用を続けることで、変更後の規約に同意したものとみなされます。" },
      ],
    },
    privacy: {
      title: "プライバシーポリシー",
      description: "FreeTexttoImageがアカウント情報、プロンプト、アップロード画像、生成画像、データ保護、削除依頼をどう扱うか説明します。",
      intro: "本ポリシーでは、収集する情報とその利用方法を説明します。",
      sections: [
        { title: "収集する情報", body: "メールアドレス、アカウント情報、プロンプト、生成設定、参考画像、生成画像、およびサービス運営に必要な基本的な技術情報を保存する場合があります。" },
        { title: "利用目的", body: "ログイン、画像の生成と保存、作品一覧の提供、不正利用の防止、サービスの安定性向上のために情報を利用します。" },
        { title: "データの安全性", body: "情報を保護するために合理的な安全対策を講じています。利用者が共有した場合や公開画像リンクを共有した場合を除き、アカウント情報や作品が他の利用者に公開されることはありません。個人情報を販売することはありません。" },
        { title: "画像の公開範囲", body: "生成画像は推測されにくい公開リンクから配信されます。リンクを知っている人が画像を閲覧できる可能性があるため、機密情報やセンシティブな内容を送信しないでください。" },
        { title: "削除とお問い合わせ", body: "作品一覧から生成画像を削除できます。一部の記録はバックアップや外部サービスに一時的に残る場合があります。プライバシーや削除についてはお問い合わせください。" },
      ],
    },
  },
};

export function getLegalContent(locale, page) {
  return legalContent[locale]?.[page] || legalContent.en[page];
}
